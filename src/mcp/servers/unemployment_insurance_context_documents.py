from pathlib import Path
from typing import Dict, Any
from mcp.server.fastmcp import FastMCP

mcp = FastMCP(name="unemployment-insurance-context-documents")

TEXT_FILES_DIR = Path("../resources")


def get_unemployment_files() -> Dict[str, Any]:
    """Get all text files from the specified directory and return as dict."""
    if not TEXT_FILES_DIR.exists():
        return {}

    text_extensions = {'.txt', '.md'}

    files_data = {}
    for file_path in TEXT_FILES_DIR.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in text_extensions:
            try:
                relative_path = file_path.relative_to(TEXT_FILES_DIR)
            except ValueError:
                relative_path = file_path

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                files_data[str(relative_path)] = {
                    "path": str(relative_path),
                    "content": content,
                    "size": len(content),
                    "extension": file_path.suffix.lower()
                }
            except Exception as e:
                files_data[str(relative_path)] = {
                    "path": str(relative_path),
                    "error": f"Could not read file: {str(e)}",
                    "extension": file_path.suffix.lower()
                }

    return files_data


@mcp.tool()
def get_supplemental_documents() -> dict:
    """
    Get unemployment insurance translation supplemental documents.

    Returns all available .txt and .md files containing unemployment insurance
    documentation that can be used as reference for translations.
    """
    files = get_unemployment_files()

    return {
        "description": "Unemployment insurance translation supplemental documents",
        "files": files
    }


if __name__ == "__main__":
    mcp.run()