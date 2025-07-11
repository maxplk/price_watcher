from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import uvicorn
import json
import re
import os

app = FastAPI()

# Enable CORS for your extension or localhost (for testing, allow all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace "*" with your extension origin or domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_json(text: str) -> str:
    """
    Try to extract JSON object from llama output, fallback to raw output.
    """
    match = re.search(r"\{.*\}", text, re.DOTALL)
    return match.group(0) if match else text

@app.post("/extract")
async def extract(request: Request):
    print("CWD:", os.getcwd())
    data = await request.json()

    prompt = (
        "Extract only the product \"name\" and the \"lowPrice\" (or \"price\") from this JSON product data.\n"
        "Output strictly a JSON object with exactly these keys: \"name\" and \"price\".\n"
        "Here is the product data:\n"
        f"{json.dumps(data, indent=2)}\n"
    )

    cmd = [
        "/home/maxp/Documents/projs/llama.cpp/build/bin/llama-cli",
        "-m", "/home/maxp/models/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
        "-sys", "You are a JSON parser. Extract only product name and price, no extra text.",
        "-p", prompt,
        "-n", "150",
        "--temp", "0.2",
        "--top-k", "10",
        "--top-p", "0.8",
    ]

    print("Running command:", cmd)
    print("LLAMA CLI path:", cmd[0])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        print("llama-cli stdout:\n", stdout)
        print("llama-cli stderr:\n", stderr)

        extracted_json = extract_json(stdout)
        print("Extracted JSON:\n", extracted_json)

        # Return parsed JSON
        return {"extracted": json.loads(extracted_json)}

    except FileNotFoundError as e:
        return {"error": f"File not found: {e.filename}"}
    except json.JSONDecodeError as e:
        return {"error": f"JSON decode error: {str(e)}. Output was: {stdout}"}
    except subprocess.CalledProcessError as e:
        return {"error": f"llama-cli failed with code {e.returncode}: {e.stderr}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
