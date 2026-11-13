# CredCloud

Интерактивная карта «как вайбкодить фронтенд»: один файл `index.html` (облака с темами + роадмап + меню версий). `vibecoding-map.html` — только редирект со старого адреса. Публикуется через GitHub Pages из ветки `main`: https://credetenebrae.github.io/CredCloud

- Контент: `DATA` (база) и git-подобные версии: `COMMITS` (коммиты с хешами) и `BRANCHES` (ветки → цвет + head) внутри `<script>` в `index.html`.
- Новый коммит по статье, продление или создание ветки — скилл `/add-version` (`.claude/skills/add-version/SKILL.md`), проверка: `node .claude/skills/add-version/scripts/check-versions.js`.
- Раскладка облаков считается в рантайме по реальным размерам пуфов: координаты руками не задавать.
- Коммит и пуш — только когда пользователь попросит; правки контента он сначала смотрит локально.
