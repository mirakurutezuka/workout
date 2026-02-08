# 🏋️ ワークアウトトラッカー（サーバー版）

トレーナーとトレーニーが同時にアクセスして記録・コメントできるワークアウト管理アプリです。

## 📁 ファイル構成

```
workout-tracker/
├── server.js          # Express サーバー（API + 静的ファイル配信）
├── package.json       # Node.js 依存関係
├── README.md          # このファイル
├── public/            # フロントエンド
│   ├── index.html     # React SPA（メイン画面）
│   └── manifest.json  # PWA マニフェスト
└── data/              # データ保存先（自動生成）
    ├── users.json
    ├── menus_WAKASA.json
    ├── menus_TEZUKA.json
    ├── comments_WAKASA.json
    └── comments_TEZUKA.json
```

## 🚀 セットアップ

### 1. Node.js をインストール
https://nodejs.org/ から LTS 版をダウンロード・インストール

### 2. 依存関係をインストール
```bash
cd workout-tracker
npm install
```

### 3. サーバーを起動
```bash
npm start
```

### 4. ブラウザでアクセス
```
http://localhost:3000
```

## 🌐 公開方法

### 方法A: VPS（推奨 — Render, Railway, Fly.io）

**Render（無料枠あり）:**
1. https://render.com でアカウント作成
2. 「New Web Service」→ GitHub リポジトリを接続（またはファイルをアップロード）
3. 設定:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
4. デプロイ完了 → 発行されたURLを共有

**Railway:**
1. https://railway.app でアカウント作成
2. 「New Project」→ GitHub リポジトリまたはファイルをアップロード
3. 自動デプロイ → URLを共有

### 方法B: 自宅PC + ngrok
```bash
# サーバーを起動
npm start

# 別のターミナルで ngrok を起動
npx ngrok http 3000
```
→ 生成されたURL（例: https://xxxx.ngrok-free.app）を共有

## 📱 使い方

### トレーニー
1. URLにスマホでアクセス
2. 自分のユーザーを選択
3. トレーニングを記録（重量・回数を入力）
4. 「💾 記録を保存」をタップ → サーバーに保存

### トレーナー
1. 同じURLにPC/スマホでアクセス
2. トレーニーのユーザーを選択
3. 記録がリアルタイムで表示される（5秒ごと自動更新）
4. 各メニューの下部「コメント」欄からフィードバックを入力
5. コメントはトレーニー側に即時反映

### CSV出力
- ホーム画面の「📤 CSV出力」でデータをダウンロード可能
- Excel/Google スプレッドシートで開ける

## 🔧 API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/users | ユーザー一覧取得 |
| POST | /api/users | ユーザー追加 |
| GET | /api/menus/:user | メニュー取得 |
| PUT | /api/menus/:user | メニュー全体保存 |
| PATCH | /api/menus/:user/:tab | タブ単位で保存 |
| GET | /api/comments/:user | コメント取得 |
| POST | /api/comments/:user | コメント追加 |
| GET | /api/sync/:user | 全データ同期 |
| GET | /api/export/:user | CSV エクスポート |

## ⚙️ 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| PORT | 3000 | サーバーポート |
