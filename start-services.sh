#!/bin/bash
# AstroOS services launcher — starts all 3 services detached, no pipe-to-tee.
# Each service writes directly to its own log file via redirect.
set -u

cd /home/z/my-project

# --- bazi-service :3004 ---
(
  cd /home/z/my-project/mini-services/bazi-service
  exec /usr/local/bin/bun --hot index.ts
) > /home/z/my-project/bazi-service.log 2>&1 &
echo $! > /home/z/my-project/bazi-service.pid

# --- chat-service :3003 ---
(
  cd /home/z/my-project/mini-services/chat-service
  exec /usr/local/bin/bun --hot index.ts
) > /home/z/my-project/chat-service.log 2>&1 &
echo $! > /home/z/my-project/chat-service.pid

# --- main Next.js :3000 ---
(
  cd /home/z/my-project
  exec /home/z/my-project/node_modules/.bin/next dev -p 3000
) > /home/z/my-project/dev.log 2>&1 &
echo $! > /home/z/my-project/main.pid

echo "launched bazi=$(cat /home/z/my-project/bazi-service.pid) chat=$(cat /home/z/my-project/chat-service.pid) main=$(cat /home/z/my-project/main.pid)"
