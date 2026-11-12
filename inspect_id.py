from app.core.config import get_settings
from pinecone import Pinecone

settings = get_settings()

pc = Pinecone(api_key=settings.pinecone_api_key)

index = pc.Index(settings.pinecone_index_name)

# List records
records = index.list(
    namespace=settings.pinecone_namespace,
    limit=100
)

print("Pinecone Record IDs:")

for record_id in records:
    print(record_id)