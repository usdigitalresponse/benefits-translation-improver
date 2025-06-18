from mcp.server.fastmcp import FastMCP
from typing import List

mcp = FastMCP("benefits_llm_translation")


@mcp.tool()
async def validate_llm_supported_languages(*names_and_codes_to_validate: str) -> List[str]:
    """
    Given a list of either language names (Spanish, English) or codes (es, en),
    validates which languages the server supports w/r/t translation.
    """
    return ["Implement me, LLM supported languages"]


@mcp.tool()
async def refine_translation_with_llm(translated_text: str, source_language: str, target_language: str) -> str:
    """
    Given text translated from source_language to target_language, calls an LLM to refine the translation
    to produce a high-quality, readable output.
    """
    return "Implement me, LLM refined translation"


@mcp.tool()
async def translate_document_with_llm(source_document: str, source_language: str, target_language: str) -> str:
    """
    Given a source document, translates the document from source language to target language.
    This method calls an LLM to generate the translation.
    """
    return "Implement me, LLM translation"

if __name__ == "__main__":
    mcp.run(transport='stdio')