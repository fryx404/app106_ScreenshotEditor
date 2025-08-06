class ScreenshotEditor {
    constructor() {
        // 初期化の確認
        console.log('ScreenshotEditor starting...');
        
        // DOM要素の取得
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 状態管理
        this.currentTool = 'text';
        this.isDragging = false;
        this.isEditingText = false;
        
        // テキスト設定
        this.currentTextColor = '#000000';
        this.currentFontSize = 100;
        this.currentFontFamily = 'Arial';
        this.isBold = false;
        this.isItalic = false;
        
        // データ管理
        this.history = [];
        this.historyIndex = -1;
        this.textObjects = [];
        this.selectedTextObject = null;
        
        // 画像データ管理
        this.baseImageData = null;  // 元画像
        

        
        console.log('Initializing elements...');
        this.initializeElements();
        console.log('Setting up event listeners...');
        this.setupEventListeners();
        console.log('Setting up canvas...');
        this.setupCanvas();
        
        this.saveToHistory();
        console.log('ScreenshotEditor initialized successfully');
    }
    
    initializeElements() {
        try {
            // 基本要素
            this.pasteBtn = document.getElementById('paste-btn');
            this.undoBtn = document.getElementById('undo-btn');
            this.redoBtn = document.getElementById('redo-btn');
            this.textBtn = document.getElementById('text-btn');
            this.moveBtn = document.getElementById('move-btn');
            this.clearTextBtn = document.getElementById('clear-text-btn');
            this.clearBtn = document.getElementById('clear-btn');
            this.saveBtn = document.getElementById('save-btn');
            this.uploadBtn = document.getElementById('upload-btn');
            this.fileInput = document.getElementById('file-input');
            
            // テキスト設定要素
            this.textColor = document.getElementById('text-color');
            this.fontSize = document.getElementById('font-size');
            this.fontFamily = document.getElementById('font-family');
            this.boldBtn = document.getElementById('bold-btn');
            this.italicBtn = document.getElementById('italic-btn');
            this.textInput = document.getElementById('text-input');
            this.statusMessage = document.getElementById('status-message');
            
            // 要素の存在確認
            const requiredElements = [
                'pasteBtn', 'textBtn', 'moveBtn', 'canvas', 'textInput'
            ];
            
            for (let elementName of requiredElements) {
                if (!this[elementName]) {
                    console.error(`Required element not found: ${elementName}`);
                    throw new Error(`Required element not found: ${elementName}`);
                }
            }
            
            this.updateButtons();
            console.log('All elements initialized successfully');
        } catch (error) {
            console.error('Error initializing elements:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        try {
            // 画像読み込み
            this.pasteBtn.addEventListener('click', () => this.pasteFromClipboard());
            
            // 履歴・クリア
            this.undoBtn.addEventListener('click', () => this.undo());
            this.redoBtn.addEventListener('click', () => this.redo());
            this.clearTextBtn.addEventListener('click', () => this.clearText());
            this.clearBtn.addEventListener('click', () => this.clearAll());
            
            // ツール
            this.textBtn.addEventListener('click', () => this.setTool('text'));
            this.moveBtn.addEventListener('click', () => this.setTool('move'));
            
            // 保存・アップロード
            this.saveBtn.addEventListener('click', () => this.saveImage());
            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
            this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
            
            // ダブルクリックでテキスト編集
            this.canvas.addEventListener('dblclick', (e) => {
                const pos = this.getMousePos(e);
                const clickedText = this.findTextAt(pos.x, pos.y);
                if (clickedText) {
                    this.selectedTextObject = clickedText;
                    this.editSelectedText();
                }
            });
            
            // テキスト設定
            this.textColor.addEventListener('change', (e) => {
                this.currentTextColor = e.target.value;
            });
            
            this.fontSize.addEventListener('change', (e) => {
                this.currentFontSize = parseInt(e.target.value);
            });
            
            this.fontFamily.addEventListener('change', (e) => {
                this.currentFontFamily = e.target.value;
            });
            
            this.boldBtn.addEventListener('click', () => this.toggleBold());
            this.italicBtn.addEventListener('click', () => this.toggleItalic());
            
            // キャンバス
            this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
            this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
            
            // キーボード・ペースト
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
            document.addEventListener('paste', (e) => this.handlePaste(e));
            
            // ドラッグ&ドロップ
            this.canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
            this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
            
            console.log('All event listeners set up successfully');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            throw error;
        }
    }
    
    setupCanvas() {
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // 白い背景で初期化
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 初期状態の基本画像データを保存（白い背景）
        this.baseImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // テキストオブジェクトは空の配列
        this.textObjects = [];
        
        console.log('Canvas set up:', this.canvas.width, 'x', this.canvas.height);
    }
    
    // クリップボードから貼り付け
    async pasteFromClipboard() {
        console.log('Attempting to paste from clipboard...');
        try {
            // Clipboard APIを使用
            if (navigator.clipboard && navigator.clipboard.read) {
                const clipboardItems = await navigator.clipboard.read();
                
                for (const clipboardItem of clipboardItems) {
                    for (const type of clipboardItem.types) {
                        if (type.startsWith('image/')) {
                            const blob = await clipboardItem.getType(type);
                            await this.loadImageFromBlob(blob);
                            return;
                        }
                    }
                }
                
                this.showMessage('クリップボードに画像が見つかりません', 'warning');
            } else {
                this.showMessage('このブラウザではクリップボード機能がサポートされていません', 'warning');
            }
        } catch (error) {
            console.error('Clipboard paste error:', error);
            this.showMessage('クリップボードへのアクセスが拒否されました。Ctrl+V をお試しください。', 'warning');
        }
    }
    
    // ペーストイベント処理
    handlePaste(e) {
        console.log('Paste event detected');
        e.preventDefault();
        
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                if (blob) {
                    this.loadImageFromBlob(blob);
                    return;
                }
            }
        }
        
        this.showMessage('ペーストされた内容に画像がありません', 'warning');
    }
    
    // ドラッグ&ドロップ処理
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    handleDrop(e) {
        e.preventDefault();
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                this.loadImageFromBlob(file);
            } else {
                this.showMessage('画像ファイルをドロップしてください', 'warning');
            }
        }
    }
    
    // Blobから画像を読み込み
    async loadImageFromBlob(blob) {
        try {
            const imageUrl = URL.createObjectURL(blob);
            const img = new Image();
            
            img.onload = () => {
                // キャンバスサイズを画像に合わせる
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                
                // 白い背景で初期化
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // 画像を描画
                this.ctx.drawImage(img, 0, 0);
                
                // URL を解放
                URL.revokeObjectURL(imageUrl);
                
                // ステータスメッセージを隠す
                if (this.statusMessage) {
                    this.statusMessage.classList.add('hidden');
                }
                
                // テキストオブジェクトをクリア
                this.textObjects = [];
                this.selectedTextObject = null;
                
                // 基本画像として保存
                this.baseImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                
                this.saveToHistory();
                this.updateButtons();
                
                this.showMessage('画像が読み込まれました！', 'success');
                console.log('Image loaded successfully:', img.width, 'x', img.height);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(imageUrl);
                this.showMessage('画像の読み込みに失敗しました', 'error');
            };
            
            img.src = imageUrl;
            
        } catch (error) {
            console.error('Image loading error:', error);
            this.showMessage('画像の処理に失敗しました', 'error');
        }
    }
    
    // ツール選択
    setTool(tool) {
        console.log('Setting tool to:', tool);
        
        this.currentTool = tool;
        
        // すべてのツールボタンからactiveクラスを削除
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 選択したツールボタンにactiveクラスを追加
        if (tool === 'text') {
            this.textBtn.classList.add('active');
            this.canvas.style.cursor = 'text';
        } else if (tool === 'move') {
            this.moveBtn.classList.add('active');
            this.canvas.style.cursor = 'move';
        }
        
        console.log('Tool set to:', tool);
    }
    
    // テキスト設定
    toggleBold() {
        this.isBold = !this.isBold;
        this.boldBtn.classList.toggle('active', this.isBold);
    }
    
    toggleItalic() {
        this.isItalic = !this.isItalic;
        this.italicBtn.classList.toggle('active', this.isItalic);
    }
    
    getFontString() {
        let font = '';
        if (this.isBold) font += 'bold ';
        if (this.isItalic) font += 'italic ';
        font += `${this.currentFontSize}px ${this.currentFontFamily}`;
        return font;
    }
    

    
    // マウスイベント処理
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        console.log('Mouse down at:', pos, 'Tool:', this.currentTool);
        
        if (this.currentTool === 'text') {
            this.addTextAtPosition(pos.x, pos.y);
        } else if (this.currentTool === 'move') {
            this.handleMoveStart(pos);
        }
    }
    
    handleMouseMove(e) {
        if (this.isDragging && this.selectedTextObject) {
            this.handleMoveUpdate(e);
        }
    }
    
    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.selectedTextObject = null;
            this.saveToHistory();
        }
    }
    

    
    // テキスト機能
    addTextAtPosition(x, y) {
        console.log('Adding text at:', x, y);
        const text = this.textInput.value.trim();
        if (!text) {
            this.showMessage('テキストを入力してください', 'warning');
            return;
        }
        
        const textObject = {
            id: Date.now(),
            text: text,
            x: x,
            y: y,
            color: this.currentTextColor,
            fontSize: this.currentFontSize,
            fontFamily: this.currentFontFamily,
            bold: this.isBold,
            italic: this.isItalic
        };
        
        this.textObjects.push(textObject);
        this.renderText(textObject);
        
        this.textInput.value = '';
        this.saveToHistory();
        this.showMessage('テキストが追加されました！', 'success');
        
        console.log('Text added:', textObject);
    }
    
    renderText(textObject) {
        const font = this.getTextFont(textObject);
        this.ctx.font = font;
        this.ctx.fillStyle = textObject.color;
        this.ctx.textBaseline = 'top';
        
        // 背景
        const metrics = this.ctx.measureText(textObject.text);
        const width = metrics.width;
        const height = textObject.fontSize;
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.fillRect(textObject.x - 2, textObject.y - 2, width + 4, height + 4);
        
        // テキスト
        this.ctx.fillStyle = textObject.color;
        this.ctx.fillText(textObject.text, textObject.x, textObject.y);
        
        // 選択中の表示
        if (textObject === this.selectedTextObject) {
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(textObject.x - 4, textObject.y - 4, width + 8, height + 8);
        }
    }
    
    getTextFont(textObject) {
        let font = '';
        if (textObject.bold) font += 'bold ';
        if (textObject.italic) font += 'italic ';
        font += `${textObject.fontSize}px ${textObject.fontFamily}`;
        return font;
    }
    
    renderAllText() {
        // テキストオブジェクトを順番に描画（重複を防ぐ）
        this.textObjects.forEach(obj => {
            this.renderText(obj);
        });
    }
    
    // 移動機能
    handleMoveStart(pos) {
        this.selectedTextObject = this.findTextAt(pos.x, pos.y);
        if (this.selectedTextObject) {
            this.isDragging = true;
            this.dragOffset = {
                x: pos.x - this.selectedTextObject.x,
                y: pos.y - this.selectedTextObject.y
            };
            this.canvas.style.cursor = 'grabbing';
        }
        this.redrawCanvas();
    }
    
    handleMoveUpdate(e) {
        if (this.selectedTextObject && this.isDragging) {
            const pos = this.getMousePos(e);
            this.selectedTextObject.x = pos.x - this.dragOffset.x;
            this.selectedTextObject.y = pos.y - this.dragOffset.y;
            
            // キャンバスを完全に再描画してテキストの重複を防ぐ
            this.redrawCanvas();
        }
    }
    
    findTextAt(x, y) {
        for (let i = this.textObjects.length - 1; i >= 0; i--) {
            const obj = this.textObjects[i];
            const font = this.getTextFont(obj);
            this.ctx.font = font;
            const metrics = this.ctx.measureText(obj.text);
            
            if (x >= obj.x && x <= obj.x + metrics.width &&
                y >= obj.y && y <= obj.y + obj.fontSize) {
                return obj;
            }
        }
        return null;
    }
    

    
    // 履歴管理（テキスト特化版）
    saveToHistory() {
        // 現在のキャンバス全体の状態を取得
        const currentCanvasState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // 履歴を現在位置までに切り詰め
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // 新しい状態を履歴に追加
        this.history.push({
            // 現在のキャンバス状態を保存
            canvasState: currentCanvasState,
            // 基本画像を保存（コピーを作成）
            baseImageData: this.baseImageData ? this.ctx.createImageData(this.baseImageData) : null,
            // テキストオブジェクトを保存（ディープコピー）
            textObjects: JSON.parse(JSON.stringify(this.textObjects))
        });
        
        // 履歴が長すぎる場合は古いものを削除
        if (this.history.length > 50) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        // ボタンの状態を更新
        this.updateButtons();
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreFromHistory();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreFromHistory();
        }
    }
    
    restoreFromHistory() {
        if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
            const state = this.history[this.historyIndex];
            
            // 1. キャンバスをクリア
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 2. キャンバス全体の状態を復元（最も効率的）
            if (state.canvasState) {
                this.ctx.putImageData(state.canvasState, 0, 0);
            }
            
            // 3. 内部状態も復元
            // 基本画像を復元
            if (state.baseImageData) {
                this.baseImageData = this.ctx.createImageData(state.baseImageData);
                Object.assign(this.baseImageData.data, state.baseImageData.data);
            } else {
                this.baseImageData = null;
            }
            
            // テキストオブジェクトを復元
            this.textObjects = JSON.parse(JSON.stringify(state.textObjects));
            
            // 4. テキストの選択状態をリセット
            this.selectedTextObject = null;
        }
        
        // ボタンの状態を更新
        this.updateButtons();
    }
    
    // キャンバス再描画
    redrawCanvas() {
        // 1. まず基本画像（スクリーンショット）を描画
        if (this.baseImageData) {
            this.ctx.putImageData(this.baseImageData, 0, 0);
        } else {
            // 基本画像がない場合は白い背景
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // 2. テキストを描画
        this.renderAllText();
    }
    
    // ファイル処理
    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showMessage('画像ファイルを選択してください', 'warning');
            return;
        }
        
        this.loadImageFromBlob(file);
    }
    

    
    // テキストのみをクリア
    clearText() {
        // テキストオブジェクトをクリア
        this.textObjects = [];
        this.selectedTextObject = null;
        
        // キャンバスを再描画（テキストなしで）
        this.redrawCanvas();
        
        this.saveToHistory();
        this.updateButtons();
        
        this.showMessage('テキストがクリアされました', 'info');
    }
    
    // すべてをクリア
    clearAll() {
        // キャンバスを白でクリア
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // すべてのデータをリセット
        this.textObjects = [];
        this.selectedTextObject = null;
        this.baseImageData = null;
        
        this.saveToHistory();
        this.updateButtons();
        
        // ステータスメッセージを表示
        if (this.statusMessage) {
            this.statusMessage.classList.remove('hidden');
        }
        
        this.showMessage('すべてクリアされました', 'info');
    }
    
    // 保存
    saveImage() {
        const link = document.createElement('a');
        link.download = `screenshot-edit-${Date.now()}.png`;
        link.href = this.canvas.toDataURL();
        link.click();
        this.showMessage('画像が保存されました！', 'success');
    }
    
    // キーボードイベント
    handleKeyDown(e) {
        // Ctrl+Z (Undo)
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }
        
        // Ctrl+Y or Ctrl+Shift+Z (Redo)
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            this.redo();
        }
        
        // Ctrl+V (Paste)
        if (e.ctrlKey && e.key === 'v') {
            e.preventDefault();
            this.pasteFromClipboard();
        }
        
        // Escキー
        if (e.key === 'Escape') {
            if (this.isEditingText) {
                // 編集モードを終了
                this.isEditingText = false;
                this.selectedTextObject = null;
                this.textInput.value = '';
                this.redrawCanvas();
            } else {
                this.setTool('text');
            }
        }
        
        // Enterキー（テキスト編集確定）
        if (e.key === 'Enter' && this.isEditingText && this.selectedTextObject) {
            const newText = this.textInput.value.trim();
            if (newText) {
                // テキストを更新
                this.selectedTextObject.text = newText;
                this.selectedTextObject.color = this.currentTextColor;
                this.selectedTextObject.fontSize = this.currentFontSize;
                this.selectedTextObject.fontFamily = this.currentFontFamily;
                this.selectedTextObject.bold = this.isBold;
                this.selectedTextObject.italic = this.isItalic;
                
                // 編集モードを終了
                this.isEditingText = false;
                this.selectedTextObject = null;
                this.textInput.value = '';
                this.redrawCanvas();
                this.saveToHistory();
                this.showMessage('テキストが更新されました', 'success');
            }
        }
        
        // Delete キー
        if (e.key === 'Delete' && this.selectedTextObject) {
            this.deleteSelectedText();
        }
        
        // E キー（テキスト編集開始）
        if (e.key === 'e' && this.selectedTextObject && !this.isEditingText) {
            this.editSelectedText();
        }
    }
    
    deleteSelectedText() {
        if (this.selectedTextObject) {
            const index = this.textObjects.indexOf(this.selectedTextObject);
            if (index !== -1) {
                this.textObjects.splice(index, 1);
                this.selectedTextObject = null;
                this.redrawCanvas();
                this.saveToHistory();
                this.showMessage('テキストが削除されました', 'info');
            }
        }
    }
    
    // テキスト編集機能
    editSelectedText() {
        if (this.selectedTextObject) {
            // テキスト入力フィールドに現在のテキストをセット
            this.textInput.value = this.selectedTextObject.text;
            
            // テキスト設定を選択中のテキストに合わせる
            this.currentTextColor = this.selectedTextObject.color;
            this.currentFontSize = this.selectedTextObject.fontSize;
            this.currentFontFamily = this.selectedTextObject.fontFamily;
            this.isBold = this.selectedTextObject.bold;
            this.isItalic = this.selectedTextObject.italic;
            
            // UI更新
            this.textColor.value = this.currentTextColor;
            this.fontSize.value = this.currentFontSize;
            this.fontFamily.value = this.currentFontFamily;
            this.boldBtn.classList.toggle('active', this.isBold);
            this.italicBtn.classList.toggle('active', this.isItalic);
            
            // テキスト入力にフォーカス
            this.textInput.focus();
            
            // 編集モードに入る
            this.isEditingText = true;
            
            this.showMessage('テキストを編集してEnterキーを押してください', 'info');
        }
    }
    
    // UI更新
    updateButtons() {
        if (this.undoBtn) this.undoBtn.disabled = this.historyIndex <= 0;
        if (this.redoBtn) this.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
    
    // 通知システム
    showMessage(message, type = 'info') {
        console.log(`Message [${type}]:`, message);
        
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            max-width: 350px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease-out;
        `;
        
        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(45deg, #56CCF2, #2F80ED)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(45deg, #FF6B6B, #FF8E53)';
                break;
            case 'warning':
                notification.style.background = 'linear-gradient(45deg, #FFD93D, #FF8E53)';
                break;
            default:
                notification.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// CSS アニメーション
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .hidden {
        display: none !important;
    }
`;
document.head.appendChild(style);

// 初期化
let editor = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    try {
        editor = new ScreenshotEditor();
        console.log('Editor initialized successfully');
    } catch (error) {
        console.error('Failed to initialize editor:', error);
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff6b6b;
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
            text-align: center;
        `;
        errorDiv.innerHTML = `
            <h3>初期化エラー</h3>
            <p>アプリケーションの初期化に失敗しました。</p>
            <p>ページを再読み込みしてください。</p>
            <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px;">再読み込み</button>
        `;
        document.body.appendChild(errorDiv);
    }
});

// デバッグ用グローバル関数
window.debugEditor = () => {
    console.log('Editor state:', editor);
    console.log('Current tool:', editor?.currentTool);
    console.log('Text objects:', editor?.textObjects);
};