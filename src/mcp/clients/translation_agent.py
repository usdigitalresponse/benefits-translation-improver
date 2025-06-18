"""
Simple translation system using MultiServerMCPClient to work with two MCP servers.
"""

import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_anthropic import ChatAnthropic
from dotenv import load_dotenv

load_dotenv()


async def main():
    mcp_client = MultiServerMCPClient(
        {
            "mt_server": {
                "command": "python",
                "args": ["../servers/machine_translation_server.py"],
                "transport": "stdio",
            },
            "llm_server": {
                "command": "python",
                "args": ["../servers/llm_translation_server.py"],
                "transport": "stdio",
            },
        }
    )

    tools = await mcp_client.get_tools()
    print(f"all available tools {tools}")

    llm = ChatAnthropic(model="claude-sonnet-4-20250514")
    llm_with_tools = llm.bind_tools(tools)

    # Test MT only
    prompt1 = (
        "Use the machine translation server to translate 'Hello world' from en to es"
    )
    result1 = await llm_with_tools.ainvoke(prompt1)
    print(f"MT result: {result1}")

    # Test hybrid approach
    prompt2 = """
    1. First use the machine translation server to get a translation of 'You are eligible for benefits' from en to es-MX
    2. Then use the LLM translation server to assess the quality of that translation
    3. If improvements are needed, use the LLM translation server to improve it
    4. Return the final result
    """
    result2 = await llm_with_tools.ainvoke(prompt2)
    print(f"Hybrid result: {result2}")


if __name__ == "__main__":
    asyncio.run(main())
