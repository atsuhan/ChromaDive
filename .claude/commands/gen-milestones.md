---
description: milestones.json を生成する
---

指定された設計ドキュメントを読み込み、milestones.json を生成してください。

## 手順

1. 指定された設計ドキュメントを読む
2. docs/architecture.md と docs/quality.md を確認する
3. 以下のルールに従って milestones.json を生成する

## マイルストーン設計ルール

- プロジェクト全体で 4〜8 個程度のマイルストーンに分割する
- 各マイルストーンは「1つの機能が動く」単位にする
- 機能単位の縦割りで分割する（レイヤーごとの横割り禁止）
  - ❌ MS1: ドメインモデル全部 → MS2: Repository全部 → MS3: UI全部
  - ✅ MS1: 基盤構築 → MS2: 機能Aを DB〜UI まで縦に通す → MS3: 機能Bを縦に通す
- ゴールは具体的に。ごまかしようのない表現で書く
  - ❌「Gateway interfaceが定義される」
  - ✅「一覧画面でデータの表示・登録・削除ができ、DBに永続化される」
- tasks配列は空で良い（着手時にPlannerが詳細設計する）

## 出力フォーマット

milestones.json として保存する。既に存在する場合は milestones.backup.json にアーカイブしてから新規作成する。

$ARGUMENTS
