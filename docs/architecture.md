# Architecture

## 構成
Next.js App Routerのデフォルト構成に従う。過度なレイヤー分けはしない。
ファイル数を最小限に保ち、必要になったら分割する。

## ディレクトリ構成
src/
├── app/              # ページ・レイアウト・APIルート
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/          # APIルート
├── components/       # 再利用可能なUIコンポーネント
├── lib/              # ユーティリティ・API呼び出し
└── types/            # 型定義（必要に応じて）

## ルール
- コンポーネントは1ファイル1コンポーネント
- Server ComponentsとClient Componentsの境界を意識する
- データ取得はServer Components側で行う
