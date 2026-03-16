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

    # Traiter dans un répertoire temporaire qui sera supprimé à la fin
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, file.filename)

            content = await file.read()
            with open(pdf_path, "wb") as f:
                f.write(content)

            # Exécuter le pipeline à l'intérieur du context manager
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
                raise HTTPException(status_code=500, detail="No consolidated clusters file produced.")

            # Lire les données du fichier avant que tmpdir ne soit détruit
            try:
                with open(final_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                if not data:
                    raise HTTPException(
                        status_code=500,
                        detail="Consolidation produced no clusters (0 consolidated clusters)."
                    )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error reading consolidated file: {e}")

            # Retourner directement les données lues en tant que réponse JSON
            return JSONResponse(content=data)

    except HTTPException:
        # Relancer les exceptions HTTP telles quelles
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")


@app.get("/health")
async def health():
    """
    Endpoint de santé simple.
    """
    return JSONResponse(status="ok")
