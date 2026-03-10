# ChromaDive

海の深度による色の見え方をシミュレーションするWebアプリ。ルアーなどのカラーが水中でどう見えるかを確認できます。

**デモ**: https://chromadive.vercel.app

## 機能

- **深度スクロール** — ページを下にスクロールすると0m〜500mまで潜降。深度に応じて背景・色が変化
- **スペクトル表示（左パネル）** — 紫(400nm)〜赤(700nm)の12色が深度でどう見えるかをリアルタイム表示
- **深度ゲージ（右パネル）** — 現在の深度をスクロール連動で表示。クリック/ドラッグで任意の深度にジャンプ
- **画像アップロード（中央）** — ルアーや釣具の画像をドロップすると、深度ごとの色の見え方をシミュレーション

## 色彩科学

Beer-Lambert法（`I = I₀ × e^(-α × d)`）に基づいて水中での光の吸収を計算しています。

| 色 | 波長 | 概ね消失する深度 |
|----|------|-----------------|
| 赤 | 700nm | ~15m |
| 橙 | 600nm | ~50m |
| 黄 | 570nm | ~100m |
| 緑 | 520nm | ~200m |
| 青 | 470nm | ~300m |

## 技術スタック

- Next.js (App Router)
- TypeScript
- React
- Canvas API（画像フィルタ処理）
- Vercel（ホスティング）

## セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/atsuhan/ChromaDive.git
cd ChromaDive

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

http://localhost:3000 でアプリが開きます。

## その他のコマンド

```bash
npm run build   # プロダクションビルド
npm run lint    # ESLintチェック
npm start       # ビルド済みアプリの起動
```

## デプロイ

Vercel CLIでデプロイ：

```bash
vercel deploy --prod
```

またはGitHubにpushすると自動デプロイされます。
