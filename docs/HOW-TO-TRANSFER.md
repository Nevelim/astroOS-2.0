# Как передать прототип AstroOS другому агенту

> Прототип занимает **528 KB** в архиве. Ниже — 4 способа передачи.

---

## Способ 1: Архив + инструкция (рекомендуется)

### Что передать
1. **`astroos-prototype.tar.gz`** (528 KB) — весь прототип
2. **`deploy-astroos.sh`** — скрипт развёртывания
3. **`docs/PROMPT-FOR-FULLSTACK-DEV.md`** — промт с полным контекстом

### Что пишет другому агенту
```
Вот архив прототипа AstroOS (528KB, Next.js 16 + TypeScript).

1. Скачай astroos-prototype.tar.gz и deploy-astroos.sh
2. Запусти: bash deploy-astroos.sh
3. Скрипт сам: распакует → установит → инициализирует БД → запустит dev-сервер :3000

Prerequisites: Node.js 20+, Bun (curl -fsSL https://bun.sh/install | bash)

Полный промт с инструкцией: docs/PROMPT-FOR-FULLSTACK-DEV.md (прочитай его первым).
```

---

## Способ 2: Git-репозиторий

```bash
cd /home/z/my-project
git init
git remote add origin https://github.com/Nevelim/astroOS-2.0.git
git add -A
git commit -m "chore: initial prototype v4.0"
git push -u origin main
```

Другому агенту:
```
git clone https://github.com/Nevelim/astroOS-2.0.git
cd astroOS-2.0
bun install
bun run db:push
bun run dev
```

---

## Способ 3: Файл-манифест

Передать структуру файлов, другой агент создаёт каждый по содержимому. Медленно, но работает без архива.

---

## Способ 4: Чтение + воссоздание

```
Прочитай эти файлы из моего sandbox и воссоздай у себя:
1. /home/z/my-project/package.json
2. /home/z/my-project/src/app/page.tsx
3. /home/z/my-project/src/components/astroos/growth-ui.tsx
... (28 файлов)
Полный список: tar -tzf /home/z/my-project/astroos-prototype.tar.gz
```

---

## Что включено в архив (148 файлов)

```
src/                     — исходный код (17 экранов + ui + growth-ui + data + i18n)
docs/                    — handover, quickstart, proposal, analyst guide, PROMPT
prisma/                  — schema.prisma
research/                — конкурентный анализ (JSON)
worklog.md               — полная история разработки
package.json, .env, config files
```

## Что НЕ включено (восстанавливается)

```
node_modules/    1.2G    → bun install
.next/           204M    → build artifacts
astroos-github/  366M    → git clone Nevelim/astroos
dev.db, dev.log          → runtime files
```

---

## Проверка целостности

```bash
tar -tzf astroos-prototype.tar.gz | wc -l    # 148 файлов
tar -tzf astroos-prototype.tar.gz | grep -E "(page.tsx|data.ts|growth-ui.tsx|package.json|PROMPT)"
```
