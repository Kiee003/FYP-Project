#!/usr/bin/env bash
# =============================================================================
# redeploy.sh — safe redeploy for the FYP Web Performance Dashboard
#
# WHAT IT DOES
#   1. Backs up your .env and SQLite database (timestamped)
#   2. Moves the current project aside (instant rollback if needed)
#   3. Unzips the new project you uploaded
#   4. Restores your .env and database into the new copy
#   5. Rebuilds and restarts the Docker container
#
# USAGE
#   Put this file in /home/alif2024/  then run:
#       chmod +x redeploy.sh          # first time only
#       ./redeploy.sh FYP-Project.zip
#
#   If you don't pass a filename it defaults to FYP-Project.zip
# =============================================================================

set -euo pipefail

# ---- Settings you can change -------------------------------------------------
BASE_DIR="/home/alif2024"                 # where the project + zip live
PROJECT="fyp-dashboard"                    # the deployed folder name
ZIP="${1:-FYP-Project.zip}"                # zip filename (arg 1, or default)
ZIP_TOPLEVEL="FYP-Project"                 # folder name created inside the zip
CONTAINER="fyp-dashboard"                  # docker container_name
STAMP="$(date +%Y%m%d-%H%M%S)"
# -----------------------------------------------------------------------------

cd "$BASE_DIR"

echo "==> [1/6] Checking the uploaded zip..."
if [[ ! -f "$ZIP" ]]; then
  echo "ERROR: '$ZIP' not found in $BASE_DIR."
  echo "       Upload your zip here first, or pass the name: ./redeploy.sh myfile.zip"
  exit 1
fi

echo "==> [2/6] Backing up .env and database (timestamp: $STAMP)..."
if [[ -f "$PROJECT/server/.env" ]]; then
  cp "$PROJECT/server/.env" "$BASE_DIR/fyp-backup-$STAMP.env"
  echo "    saved fyp-backup-$STAMP.env"
else
  echo "    WARNING: no existing server/.env found to back up."
fi
if [[ -f "$PROJECT/server/data/audit_history.db" ]]; then
  sudo cp "$PROJECT/server/data/audit_history.db" "$BASE_DIR/fyp-backup-$STAMP.db"
  echo "    saved fyp-backup-$STAMP.db"
else
  echo "    NOTE: no existing database found (fine on a first deploy)."
fi

echo "==> [3/6] Stopping and removing the old container..."
sudo docker stop "$CONTAINER" 2>/dev/null || echo "    (container not running)"
sudo docker rm   "$CONTAINER" 2>/dev/null || echo "    (no container to remove)"

echo "==> [4/6] Moving current project aside for rollback..."
if [[ -d "$PROJECT" ]]; then
  rm -rf "$PROJECT-OLD"                 # clear any previous rollback copy
  mv "$PROJECT" "$PROJECT-OLD"
  echo "    old code is now in $PROJECT-OLD"
fi

echo "==> [5/6] Unzipping new project and restoring your data..."
rm -rf "$ZIP_TOPLEVEL"                  # clear a stale extraction if present
unzip -q "$ZIP"
if [[ ! -d "$ZIP_TOPLEVEL" ]]; then
  echo "ERROR: expected folder '$ZIP_TOPLEVEL' inside the zip but didn't find it."
  echo "       Extracted contents:"; ls -1
  echo "       Rolling back..."; mv "$PROJECT-OLD" "$PROJECT"
  exit 1
fi
mv "$ZIP_TOPLEVEL" "$PROJECT"
cd "$PROJECT"

# restore .env
if [[ -f "$BASE_DIR/fyp-backup-$STAMP.env" ]]; then
  cp "$BASE_DIR/fyp-backup-$STAMP.env" server/.env
  echo "    restored server/.env"
fi
# restore database (keeps existing accounts + history)
mkdir -p server/data
if [[ -f "$BASE_DIR/fyp-backup-$STAMP.db" ]]; then
  sudo cp "$BASE_DIR/fyp-backup-$STAMP.db" server/data/audit_history.db
  echo "    restored database"
fi

# sanity check: .env must exist or the app can't start
if [[ ! -f server/.env ]]; then
  echo "WARNING: server/.env is missing. Login/JWT and DeepSeek will fail."
  echo "         Create it before the app will work correctly."
fi

echo "==> [6/6] Building and starting (first build can take several minutes)..."
sudo docker compose build && sudo docker compose up -d

echo ""
echo "============================================================"
echo " Done. Check the logs with:"
echo "     sudo docker compose logs -f"
echo " Then open:  http://10.82.8.65:5001/"
echo ""
echo " Rollback if needed:"
echo "     cd $BASE_DIR"
echo "     sudo docker compose -f $PROJECT/docker-compose.yml down"
echo "     rm -rf $PROJECT && mv $PROJECT-OLD $PROJECT"
echo "     cd $PROJECT && sudo docker compose up -d --build"
echo ""
echo " Once you've confirmed it works, clean up with:"
echo "     rm -rf $BASE_DIR/$PROJECT-OLD"
echo "     rm $BASE_DIR/$ZIP"
echo "============================================================"
