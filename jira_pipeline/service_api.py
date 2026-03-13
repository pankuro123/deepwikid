# jira_pipeline/service_api.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
import os
import tempfile
import json
from pipeline import run_full_pipeline

app = FastAPI(title="Jira PDF to Requirements API")

@app.post("/process_pdf")
async def process_pdf(file: UploadFile = File(...)):
    """
    Endpoint principal :
    - reçoit un PDF Jira,
    - exécute le pipeline complet,
    - renvoie le fichier JSON des exigences consolidées.
    """

    # Vérifier le type de fichier
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Créer un fichier temporaire pour sauvegarder le PDF uploadé
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, file.filename)

            content = await file.read()
            with open(pdf_path, "wb") as f:
                f.write(content)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving uploaded file: {e}")

    # Exécuter le pipeline
    try:
        result_paths = run_full_pipeline(
            pdf_path=pdf_path,
            work_dir=tmpdir,
            ticket_prefix="COMDEV."
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline error: {e}")

    # Vérifier que le fichier consolidé existe
    final_path = result_paths.get("requirements_clusters_consolidated")

    if not final_path or not os.path.exists(final_path):
        raise HTTPException(status_code=500, detail="No consolidated clusters file produced (maybe LLM/embedding error).")

    # Vérifier que le fichier consolidé contient au moins un cluster
    try:
        with open(final_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not data:  # Si le fichier est vide
            raise HTTPException(
                status_code=500,
                detail="Consolidation produced no clusters (0 consolidated clusters)."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading consolidated file: {e}")

    # Retourner le fichier JSON consolidé
    return FileResponse(
        path=final_path,
        filename="requirements_clusters_consolidated.json",
        media_type="application/json"
    )


@app.get("/health")
async def health():
    """
    Endpoint de santé simple.
    """
    return JSONResponse(status="ok")
