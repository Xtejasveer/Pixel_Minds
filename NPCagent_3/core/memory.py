import os

import aiofiles
from autogen_core.memory import ListMemory, MemoryContent, MemoryMimeType
from autogen_ext.memory.chromadb import (
    ChromaDBVectorMemory,
    PersistentChromaDBVectorMemoryConfig,
    SentenceTransformerEmbeddingFunctionConfig,
)
from pypdf import PdfReader


def setup_short_term_memory() -> ListMemory:
    return ListMemory()


def setup_rag_memory() -> ChromaDBVectorMemory:
    return ChromaDBVectorMemory(
        config=PersistentChromaDBVectorMemoryConfig(
            collection_name="npc_story",
            persistence_path=os.path.join(os.getcwd(), "memory"),
            k=3,
            score_threshold=0.4,
            embedding_function_config=SentenceTransformerEmbeddingFunctionConfig(
                model_name="all-MiniLM-L6-v2"
            ),
        )
    )


async def index_story_file(
    file_path: str, rag_memory: ChromaDBVectorMemory
) -> None:
    try:
        text = ""
        file_extension = os.path.splitext(file_path)[1].lower()

        if file_extension == ".pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += page.extract_text() or ""
        elif file_extension == ".txt":
            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                text = await f.read()
        else:
            print(
                f"Unsupported file type: {file_extension}. Only .txt and .pdf are supported."
            )
            return

        if not text:
            print(f"No text found in the file: {file_path}")
            return

        chunks = [text[i : i + 1200] for i in range(0, len(text), 1200)]
        for i, chunk in enumerate(chunks):
            await rag_memory.add(
                MemoryContent(
                    content=chunk,
                    mime_type=MemoryMimeType.TEXT,
                    metadata={"source": file_path, "chunk_index": i},
                )
            )
        print(f"Indexed {len(chunks)} chunks from {file_path}")
    except Exception as e:
        print(f"Error indexing story file: {str(e)}")


async def add_user_text_story(
    story_text: str, rag_memory: ChromaDBVectorMemory
) -> None:
    try:
        chunks = [story_text[i : i + 1200] for i in range(0, len(story_text), 1200)]
        for i, chunk in enumerate(chunks):
            await rag_memory.add(
                MemoryContent(
                    content=chunk,
                    mime_type=MemoryMimeType.TEXT,
                    metadata={"source": "user_input", "chunk_index": i},
                )
            )
        print(f"Indexed {len(chunks)} chunks from user input.")
    except Exception as e:
        print(f"Error adding user text story: {str(e)}")