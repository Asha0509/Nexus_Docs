"""
NexusDocs Vector Store Module
Handles ChromaDB integration for document embeddings and similarity search.
"""

import os
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

import chromadb
from chromadb.config import Settings
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

from config import (
    CHROMA_PERSIST_DIR,
    COLLECTION_NAME
)
from processor import ProcessedDocument, DocumentChunk


@dataclass
class SearchResult:
    """Represents a search result with content and metadata."""
    content: str
    metadata: dict
    score: float


class VectorStore:
    """Handles vector storage and retrieval using ChromaDB."""
    
    def __init__(self):
        self._embeddings = None
        self._client = None
        self._collection = None
    
    @property
    def embeddings(self) -> HuggingFaceEmbeddings:
        """Lazy initialization of embeddings using free HuggingFace model."""
        if self._embeddings is None:
            # Using all-MiniLM-L6-v2 - a small, fast, and free embedding model
            self._embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
                model_kwargs={'device': 'cpu'},
                encode_kwargs={'normalize_embeddings': True}
            )
        return self._embeddings
    
    @property
    def client(self) -> chromadb.PersistentClient:
        """Lazy initialization of ChromaDB client."""
        if self._client is None:
            self._client = chromadb.PersistentClient(
                path=str(CHROMA_PERSIST_DIR),
                settings=Settings(anonymized_telemetry=False)
            )
        return self._client
    
    @property
    def collection(self):
        """Get or create the main collection."""
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"}
            )
        return self._collection
    
    def add_document(self, processed_doc: ProcessedDocument) -> bool:
        """
        Add a processed document to the vector store.
        
        Args:
            processed_doc: The processed document with chunks
            
        Returns:
            True if successful
        """
        try:
            # Prepare data for ChromaDB
            ids = []
            documents = []
            metadatas = []
            
            for chunk in processed_doc.chunks:
                chunk_id = f"{processed_doc.doc_id}_{chunk.chunk_index}"
                ids.append(chunk_id)
                documents.append(chunk.content)
                metadatas.append(chunk.metadata)
            
            # Generate embeddings
            embeddings = self.embeddings.embed_documents(documents)
            
            # Add to collection
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            
            return True
        except Exception as e:
            raise ValueError(f"Failed to add document to vector store: {e}")
    
    def delete_document(self, doc_id: str) -> bool:
        """
        Delete all chunks for a document from the vector store.
        
        Args:
            doc_id: The document ID to delete
            
        Returns:
            True if successful
        """
        try:
            # Find all chunks with this doc_id
            results = self.collection.get(
                where={"doc_id": doc_id}
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
            
            return True
        except Exception as e:
            raise ValueError(f"Failed to delete document: {e}")
    
    def search(
        self,
        query: str,
        folder: Optional[str] = None,
        n_results: int = 5
    ) -> List[SearchResult]:
        """
        Search for relevant chunks based on a query.
        
        Args:
            query: The search query
            folder: Optional folder to scope the search
            n_results: Number of results to return
            
        Returns:
            List of SearchResult objects
        """
        try:
            # Generate query embedding
            query_embedding = self.embeddings.embed_query(query)
            
            # Build where clause for folder filtering
            where_clause = None
            if folder and folder != "all":
                where_clause = {"folder": folder}
            
            # Perform search
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_clause,
                include=["documents", "metadatas", "distances"]
            )
            
            # Convert to SearchResult objects
            search_results = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    # Convert distance to similarity score (cosine distance -> similarity)
                    distance = results['distances'][0][i] if results['distances'] else 0
                    score = 1 - distance  # Convert distance to similarity
                    
                    search_results.append(SearchResult(
                        content=doc,
                        metadata=results['metadatas'][0][i] if results['metadatas'] else {},
                        score=score
                    ))
            
            return search_results
        except Exception as e:
            raise ValueError(f"Search failed: {e}")
    
    def get_all_documents(self) -> List[Dict[str, Any]]:
        """
        Get a list of all unique documents in the store.
        
        Returns:
            List of document metadata (deduplicated by doc_id)
        """
        try:
            # Get all items from collection
            results = self.collection.get(include=["metadatas"])
            
            # Deduplicate by doc_id
            docs_map = {}
            for metadata in results.get('metadatas', []):
                if metadata:
                    doc_id = metadata.get('doc_id')
                    if doc_id and doc_id not in docs_map:
                        docs_map[doc_id] = {
                            "doc_id": doc_id,
                            "filename": metadata.get('filename'),
                            "folder": metadata.get('folder'),
                            "file_type": metadata.get('file_type'),
                            "total_chunks": metadata.get('total_chunks', 0)
                        }
            
            return list(docs_map.values())
        except Exception as e:
            raise ValueError(f"Failed to get documents: {e}")
    
    def get_folders(self) -> List[str]:
        """
        Get a list of all unique folders.
        
        Returns:
            List of folder names
        """
        try:
            results = self.collection.get(include=["metadatas"])
            
            folders = set()
            for metadata in results.get('metadatas', []):
                if metadata and metadata.get('folder'):
                    folders.add(metadata.get('folder'))
            
            return sorted(list(folders))
        except Exception as e:
            return []
    
    def get_documents_in_folder(self, folder: str) -> List[Dict[str, Any]]:
        """
        Get all documents in a specific folder.
        
        Args:
            folder: The folder name
            
        Returns:
            List of document metadata
        """
        try:
            results = self.collection.get(
                where={"folder": folder},
                include=["metadatas"]
            )
            
            docs_map = {}
            for metadata in results.get('metadatas', []):
                if metadata:
                    doc_id = metadata.get('doc_id')
                    if doc_id and doc_id not in docs_map:
                        docs_map[doc_id] = {
                            "doc_id": doc_id,
                            "filename": metadata.get('filename'),
                            "folder": metadata.get('folder'),
                            "file_type": metadata.get('file_type'),
                            "total_chunks": metadata.get('total_chunks', 0)
                        }
            
            return list(docs_map.values())
        except Exception as e:
            return []
    
    def get_collection_stats(self) -> Dict[str, int]:
        """Get statistics about the collection."""
        try:
            count = self.collection.count()
            docs = self.get_all_documents()
            folders = self.get_folders()
            
            return {
                "total_chunks": count,
                "total_documents": len(docs),
                "total_folders": len(folders)
            }
        except Exception:
            return {
                "total_chunks": 0,
                "total_documents": 0,
                "total_folders": 0
            }


# Singleton instance
vector_store = VectorStore()
