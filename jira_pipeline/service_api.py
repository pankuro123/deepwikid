# jira_pipeline/service_api.py

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
import json
import uuid
from datetime import datetime

app = FastAPI(title="Jira PDF to Requirements API")

import tempfile

# Persistent directory to store pipeline results
try:
    RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
    os.makedirs(RESULTS_DIR, exist_ok=True)
except (PermissionError, OSError):
    RESULTS_DIR = os.path.join(tempfile.gettempdir(), "jira_results")
    os.makedirs(RESULTS_DIR, exist_ok=True)


@app.post("/process_pdf")
async def process_pdf(file: UploadFile = File(...)):
    """
    Endpoint principal :
    - reçoit un PDF Jira,
    - exécute le pipeline complet,
    - sauvegarde le résultat de manière persistante,
    - renvoie le JSON des exigences consolidées.
    """

    # Vérifier le type de fichier
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Créer un dossier de travail persistant pour cette exécution
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:6]
    work_dir = os.path.join(RESULTS_DIR, run_id)
    os.makedirs(work_dir, exist_ok=True)

    # Sauvegarder le PDF uploadé
    try:
        pdf_path = os.path.join(work_dir, file.filename)
        content = await file.read()
        with open(pdf_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving uploaded file: {e}")

    # Exécuter le pipeline (lazy import to avoid import errors at mount time)
    try:
        from pipeline import run_full_pipeline
        result_paths = run_full_pipeline(
            pdf_path=pdf_path,
            work_dir=work_dir,
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

    # Lire et valider le fichier consolidé
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

    # Sauvegarder un fichier de métadonnées pour permettre la consultation ultérieure
    meta = {
        "run_id": run_id,
        "original_filename": file.filename,
        "created_at": datetime.now().isoformat(),
        "result_paths": {k: os.path.basename(v) for k, v in result_paths.items()},
    }
    with open(os.path.join(work_dir, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # Retourner le JSON directement dans la réponse (pas de FileResponse)
    return JSONResponse(content={
        "run_id": run_id,
        "created_at": meta["created_at"],
        "original_filename": file.filename,
        "clusters": data,
    })


@app.get("/results")
async def list_results():
    """
    Liste toutes les exécutions précédentes du pipeline.
    """
    runs = []
    for entry in sorted(os.listdir(RESULTS_DIR), reverse=True):
        meta_path = os.path.join(RESULTS_DIR, entry, "meta.json")
        if os.path.isfile(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                runs.append(meta)
            except Exception:
                runs.append({"run_id": entry, "error": "Could not read metadata"})
    return JSONResponse(content=runs)


@app.get("/results/{run_id}")
async def get_result(run_id: str):
    """
    Récupère le résultat d'une exécution précédente par son run_id.
    """
    run_dir = os.path.join(RESULTS_DIR, run_id)
    if not os.path.isdir(run_dir):
        raise HTTPException(status_code=404, detail=f"Run '{run_id}' not found.")

    # Lire les métadonnées
    meta_path = os.path.join(run_dir, "meta.json")
    if not os.path.isfile(meta_path):
        raise HTTPException(status_code=404, detail="Metadata file missing for this run.")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    # Trouver le fichier consolidé
    consolidated_name = meta.get("result_paths", {}).get("requirements_clusters_consolidated")
    if not consolidated_name:
        raise HTTPException(status_code=404, detail="No consolidated result path in metadata.")

    consolidated_path = os.path.join(run_dir, consolidated_name)
    if not os.path.isfile(consolidated_path):
        raise HTTPException(status_code=404, detail="Consolidated result file not found on disk.")

    with open(consolidated_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return JSONResponse(content={
        "run_id": run_id,
        "created_at": meta.get("created_at"),
        "original_filename": meta.get("original_filename"),
        "clusters": data,
    })


@app.get("/health")
async def health():
    """
    Endpoint de santé simple.
    """
    return JSONResponse(content={"status": "ok"})
