"""
NexusDocs - Intelligent Document Platform
Main FastAPI Application

A "Second Brain" that allows users to upload documents and chat with them
using Retrieval-Augmented Generation (RAG).
"""

import os
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, SystemMessage

from config import (
    UPLOAD_DIR,
    SUPPORTED_EXTENSIONS,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
    OPENAI_MODEL
)
from processor import processor, ProcessedDocument
from vector_store import vector_store, SearchResult


# ============================================================================
# FastAPI App Configuration
# ============================================================================

app = FastAPI(
    title="NexusDocs API",
    description="Intelligent Document Platform - Chat with your documents",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Pydantic Models
# ============================================================================

class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    query: str
    folder: Optional[str] = None  # Optional folder scope


class Citation(BaseModel):
    """Citation model for source references."""
    filename: str
    folder: str
    chunk_index: int
    content_preview: str
    relevance_score: float


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    answer: str
    citations: List[Citation]
    query: str


class DocumentInfo(BaseModel):
    """Document information model."""
    doc_id: str
    filename: str
    folder: str
    file_type: str
    total_chunks: int


class FolderInfo(BaseModel):
    """Folder information model."""
    name: str
    document_count: int


class UploadResponse(BaseModel):
    """Response model for upload endpoint."""
    success: bool
    message: str
    document: Optional[DocumentInfo] = None


class StatsResponse(BaseModel):
    """Response model for stats endpoint."""
    total_documents: int
    total_chunks: int
    total_folders: int


# ============================================================================
# RAG Chat Engine
# ============================================================================

class RAGEngine:
    """Retrieval-Augmented Generation engine for document Q&A."""
    
    def __init__(self):
        self._llm = None
    
    @property
    def llm(self) -> ChatOpenAI:
        """Lazy initialization of LLM."""
        if self._llm is None:
            if not OPENAI_API_KEY:
                raise ValueError("OPENAI_API_KEY not configured")
            self._llm = ChatOpenAI(
                model=OPENAI_MODEL,
                temperature=0.2,
                openai_api_key=OPENAI_API_KEY,
                openai_api_base=OPENAI_BASE_URL
            )
        return self._llm
    
    def generate_answer(
        self,
        query: str,
        search_results: List[SearchResult]
    ) -> str:
        """
        Generate an answer using retrieved context.
        
        Args:
            query: User's question
            search_results: Retrieved document chunks
            
        Returns:
            Generated answer string
        """
        if not search_results:
            return "I couldn't find any relevant information in the documents to answer your question. Please try rephrasing your query or ensure relevant documents are uploaded."
        
        # Build context from search results
        context_parts = []
        for i, result in enumerate(search_results, 1):
            source = f"[Source {i}: {result.metadata.get('filename', 'Unknown')}]"
            context_parts.append(f"{source}\n{result.content}")
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Build prompt
        system_prompt = """You are NexusDocs, an intelligent document assistant. Your role is to answer questions based ONLY on the provided document context.

Rules:
1. ONLY use information from the provided context to answer questions
2. If the context doesn't contain enough information, say so clearly
3. When citing information, reference the source document (e.g., "According to [filename]...")
4. Be concise but thorough in your answers
5. If multiple documents provide relevant information, synthesize them into a coherent answer
6. Never make up information that isn't in the context"""

        user_prompt = f"""Context from documents:
{context}

---

Question: {query}

Please provide a comprehensive answer based on the document context above. Include references to specific source documents when appropriate."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ]
        
        response = self.llm.invoke(messages)
        return response.content


# Initialize RAG engine
rag_engine = RAGEngine()


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "NexusDocs API",
        "version": "1.0.0"
    }


@app.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get collection statistics."""
    stats = vector_store.get_collection_stats()
    return StatsResponse(
        total_documents=stats["total_documents"],
        total_chunks=stats["total_chunks"],
        total_folders=stats["total_folders"]
    )


# ----------------------------------------------------------------------------
# Document Management Endpoints
# ----------------------------------------------------------------------------

@app.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    folder: str = Form(default="default")
):
    """
    Upload and process a document.
    
    Supports: PDF, DOCX, TXT, MD files.
    """
    # Validate file extension
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_extension}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    
    # Create folder directory if needed
    folder_path = UPLOAD_DIR / folder
    folder_path.mkdir(parents=True, exist_ok=True)
    
    # Save file temporarily
    file_path = folder_path / file.filename
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process document
        processed_doc = processor.process_document(file_path, folder)
        
        # Add to vector store
        vector_store.add_document(processed_doc)
        
        return UploadResponse(
            success=True,
            message=f"Successfully processed '{file.filename}' ({processed_doc.total_chunks} chunks)",
            document=DocumentInfo(
                doc_id=processed_doc.doc_id,
                filename=processed_doc.filename,
                folder=processed_doc.folder,
                file_type=processed_doc.file_type,
                total_chunks=processed_doc.total_chunks
            )
        )
    except Exception as e:
        # Clean up file if processing failed
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/documents", response_model=List[DocumentInfo])
async def list_documents(folder: Optional[str] = Query(None)):
    """
    List all documents, optionally filtered by folder.
    """
    if folder:
        docs = vector_store.get_documents_in_folder(folder)
    else:
        docs = vector_store.get_all_documents()
    
    return [
        DocumentInfo(
            doc_id=doc["doc_id"],
            filename=doc["filename"],
            folder=doc["folder"],
            file_type=doc["file_type"],
            total_chunks=doc["total_chunks"]
        )
        for doc in docs
    ]


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Delete a document from the knowledge base.
    """
    try:
        # Get document info first to find the file
        docs = vector_store.get_all_documents()
        doc_info = next((d for d in docs if d["doc_id"] == doc_id), None)
        
        if not doc_info:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete from vector store
        vector_store.delete_document(doc_id)
        
        # Delete physical file
        file_path = UPLOAD_DIR / doc_info["folder"] / doc_info["filename"]
        if file_path.exists():
            file_path.unlink()
        
        return {"success": True, "message": f"Document '{doc_info['filename']}' deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------------
# Folder Management Endpoints
# ----------------------------------------------------------------------------

@app.get("/folders", response_model=List[FolderInfo])
async def list_folders():
    """
    List all folders with document counts.
    """
    folders = vector_store.get_folders()
    folder_infos = []
    
    for folder in folders:
        docs = vector_store.get_documents_in_folder(folder)
        folder_infos.append(FolderInfo(
            name=folder,
            document_count=len(docs)
        ))
    
    return folder_infos


@app.post("/folders/{folder_name}")
async def create_folder(folder_name: str):
    """
    Create a new folder.
    """
    folder_path = UPLOAD_DIR / folder_name
    folder_path.mkdir(parents=True, exist_ok=True)
    return {"success": True, "message": f"Folder '{folder_name}' created"}


@app.delete("/folders/{folder_name}")
async def delete_folder(folder_name: str):
    """
    Delete a folder and all its documents.
    """
    try:
        # Delete all documents in folder from vector store
        docs = vector_store.get_documents_in_folder(folder_name)
        for doc in docs:
            vector_store.delete_document(doc["doc_id"])
        
        # Delete physical folder
        folder_path = UPLOAD_DIR / folder_name
        if folder_path.exists():
            shutil.rmtree(folder_path)
        
        return {"success": True, "message": f"Folder '{folder_name}' and its documents deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------------------------------------------
# Chat Endpoint
# ----------------------------------------------------------------------------

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with your documents using RAG.
    
    Optionally scope the search to a specific folder for better accuracy.
    """
    try:
        # Search for relevant chunks
        search_results = vector_store.search(
            query=request.query,
            folder=request.folder,
            n_results=5
        )
        
        # Generate answer using RAG
        answer = rag_engine.generate_answer(request.query, search_results)
        
        # Build citations - deduplicate by filename, keep best match per document
        seen_docs = {}
        for result in search_results:
            filename = result.metadata.get("filename", "Unknown")
            score = result.score
            
            if filename not in seen_docs or score > seen_docs[filename]["score"]:
                seen_docs[filename] = {
                    "filename": filename,
                    "folder": result.metadata.get("folder", "Unknown"),
                    "chunk_index": result.metadata.get("chunk_index", 0),
                    "content_preview": result.content[:200] + "..." if len(result.content) > 200 else result.content,
                    "score": score
                }
        
        # Convert to Citation objects, sorted by score
        citations = [
            Citation(
                filename=doc["filename"],
                folder=doc["folder"],
                chunk_index=doc["chunk_index"],
                content_preview=doc["content_preview"],
                relevance_score=round(doc["score"], 3)
            )
            for doc in sorted(seen_docs.values(), key=lambda x: x["score"], reverse=True)
        ]
        
        return ChatResponse(
            answer=answer,
            citations=citations,
            query=request.query
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
