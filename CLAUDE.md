# ChromaDive

色彩を探索・可視化するWebアプリケーション。

## Tech Stack
- TypeScript
- Next.js (App Router)
- React

## Commands
- 開発: `npm run dev`
- テスト: `npm test`
- ビルド: `npm run build`
- リント: `npm run lint`

## Architecture
@docs/architecture.md

## Quality
@docs/quality.md

## Coding Rules
- コメントは「なぜそうしたか」を初見の人にも伝わるように書く
- 関数名は動詞から始める（例: fetchData, calculateScore）
- 定数は UPPER_SNAKE_CASE（例: MAX_RETRY_COUNT）
- モック・ダミーデータでのごまかし禁止。実際に動作する実装をする
- 型定義にanyを使わない
- コンポーネント名はPascalCase、関数・変数はcamelCase

## Git Workflow
- ブランチを切って作業する（feature/xxx, fix/xxx）
- IMPORTANT: コミットメッセージは日本語で書く。きりのいいところで頻繁にコミット
- PRは日本語で作成し、変更の目的と影響範囲を明記する
- 知識の永続化はファイルに書く。LLMの記憶に頼らない

## Development Style
- 機能単位の縦割りで段階的に動くものを作る（横割りウォーターフォール禁止）
- 完了条件は「実際に動くこと」。テストが通るだけでは不合格
- 依存関係のないタスクはウェーブ単位で並列実行する
- 1タスク = 1ブランチ = 1エージェントセッション（git worktree活用）
- ウェーブ内のタスク完了後、Verifierがdevelopへマージ・統合テスト
