from app.services.ingestion import load_file, chunk_documents
from pathlib import Path
from app.rag.vectorstore import add_documents, get_vectorstore

docs = load_file(Path("data/sample_kb/company_it_handbook.md"))
chunks = chunk_documents(docs)

add_documents(chunks)

print(chunks)

store = get_vectorstore()

print("Pinecone stats:")
print(store.index.describe_index_stats())