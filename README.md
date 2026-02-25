# NexusDocs - Intelligent Document Platform 🧠

Your **Second Brain** - Upload documents and chat with them using AI-powered Retrieval-Augmented Generation (RAG).

![NexusDocs](https://img.shields.io/badge/NexusDocs-v1.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

## Features

- 📄 **Multi-Format Support**: Upload PDF, DOCX, TXT, and Markdown files
- 💬 **Chat with Documents**: Ask questions and get AI-powered answers with citations
- 📁 **Folder Organization**: Organize documents into folders for scoped searches
- 🔍 **Smart Retrieval**: Uses vector similarity search to find relevant content
- 📌 **Source Citations**: Every answer includes references to source documents
- 🎨 **Modern UI**: Beautiful dark-themed dashboard built with Next.js and Tailwind

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│   FastAPI       │────▶│   ChromaDB      │
│   (Frontend)    │     │   (Backend)     │     │ (Vector Store)  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   OpenAI API    │
                        │ (LLM + Embed)   │
                        └─────────────────┘
```

## Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **OpenAI API Key** (for embeddings and chat)

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

Edit the `.env` file:
```env
OPENAI_API_KEY=sk-your-api-key-here
```

Start the backend server:
```bash
python main.py
# or
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### 2. Frontend Setup

```bash
# Navigate to frontend (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will be available at `http://localhost:3000`

## Usage Guide

### 1. Upload Documents
- Click on the **Library** tab
- Drag and drop files or click to browse
- Supported formats: `.pdf`, `.docx`, `.txt`, `.md`
- Files are automatically chunked and indexed

### 2. Organize with Folders
- Create folders using the **New Folder** button in the sidebar
- Upload documents to specific folders
- Select a folder to scope your searches

### 3. Chat with Your Documents
- Switch to the **Chat** tab
- Ask questions in natural language
- View AI-generated answers with source citations
- Expand citations to see the exact text passages

### 4. Folder Scoping (Stretch Feature)
- Select a specific folder in the sidebar
- The AI will only search within that folder
- Reduces noise and improves retrieval accuracy

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/stats` | Get collection statistics |
| POST | `/upload` | Upload a document |
| GET | `/documents` | List all documents |
| DELETE | `/documents/{doc_id}` | Delete a document |
| GET | `/folders` | List all folders |
| POST | `/folders/{name}` | Create a folder |
| DELETE | `/folders/{name}` | Delete a folder |
| POST | `/chat` | Chat with documents |

## Project Structure

```
Atlassian_Project/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── processor.py      # Document text extraction
│   ├── vector_store.py   # ChromaDB integration
│   ├── config.py         # Configuration settings
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment template
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx      # Main dashboard
    │   │   ├── layout.tsx    # Root layout
    │   │   └── globals.css   # Global styles
    │   ├── components/
    │   │   ├── FileUpload.tsx
    │   │   ├── DocumentList.tsx
    │   │   ├── ChatInterface.tsx
    │   │   ├── FolderSidebar.tsx
    │   │   └── StatsDisplay.tsx
    │   └── lib/
    │       ├── api.ts        # API client
    │       └── types.ts      # TypeScript types
    └── package.json
```

## Technical Details

### Document Processing
- **Text Extraction**: PyPDF for PDFs, python-docx for DOCX, native for TXT/MD
- **Chunking**: RecursiveCharacterTextSplitter with 1000 char chunks, 200 overlap
- **Embeddings**: OpenAI text-embedding-3-small model

### Vector Store
- **Database**: ChromaDB (persistent, local storage)
- **Similarity**: Cosine similarity search
- **Metadata**: Filename, folder, chunk index for filtering

### RAG Pipeline
1. User query is embedded using OpenAI
2. Top 5 similar chunks are retrieved from ChromaDB
3. Context is combined with the query
4. GPT-4o-mini generates the answer with citations

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | Your OpenAI API key (required) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat model to use |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `CHROMA_PERSIST_DIR` | `./chroma_db` | ChromaDB storage path |
| `UPLOAD_DIR` | `./uploads` | Document upload path |

## Troubleshooting

### Backend won't start
- Ensure Python 3.10+ is installed
- Check that all dependencies are installed: `pip install -r requirements.txt`
- Verify `.env` file exists with valid `OPENAI_API_KEY`

### Frontend can't connect to backend
- Ensure backend is running on port 8000
- Check for CORS errors in browser console
- Verify `NEXT_PUBLIC_API_URL` if using custom backend URL

### Documents not being indexed
- Check file format is supported (.pdf, .docx, .txt, .md)
- Ensure file is not empty or corrupted
- Check backend logs for detailed error messages

## License

MIT License - feel free to use and modify!

---

Built with ❤️ using FastAPI, Next.js, LangChain, and ChromaDB
