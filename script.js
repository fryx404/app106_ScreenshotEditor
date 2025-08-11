// グローバル変数
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let image = null;
let textElements = [];
let selectedTextElement = null;
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isEditingText = false;
let editingTextId = null;

// デフォルト設定
const DEFAULT_FONT_SIZE = 80;
const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_BG_COLOR = '#000000';
const DEFAULT_BG_ENABLED = false;

// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    const pasteBtn = document.getElementById('paste-btn');
    const fileInput = document.getElementById('file-input');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const saveBtn = document.getElementById('save-btn');
    const textInputContainer = document.getElementById('text-input-container');
    const textInput = document.getElementById('text-input');
    const applyTextBtn = document.getElementById('apply-text-btn');
    const cancelTextBtn = document.getElementById('cancel-text-btn');
    const placeholder = document.getElementById('placeholder-message');

    // 背景色の初期状態を設定
    const bgEnabled = document.getElementById('bg-enabled');
    bgEnabled.checked = DEFAULT_BG_ENABLED; // falseを設定

    // クリップボードから画像を貼り付け
    pasteBtn.addEventListener('click', () => {
        navigator.clipboard.read()
            .then(clipboardItems => {
                for (const clipboardItem of clipboardItems) {
                    for (const type of clipboardItem.types) {
                        if (type.startsWith('image/')) {
                            clipboardItem.getType(type)
                                .then(blob => {
                                    loadImageFromBlob(blob);
                                })
                                .catch(err => {
                                    console.error('クリップボードからの画像の取得に失敗しました:', err);
                                    alert('クリップボードからの画像の取得に失敗しました。');
                                });
                            return;
                        }
                    }
                }
                alert('クリップボードに画像が見つかりませんでした。');
            })
            .catch(err => {
                console.error('クリップボードの読み取りに失敗しました:', err);
                alert('クリップボードの読み取りに失敗しました。ブラウザの権限を確認してください。');
            });
    });

    // ドキュメント全体のペーストイベントをリッスン
    document.addEventListener('paste', (e) => {
        if (e.clipboardData && e.clipboardData.items) {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    loadImageFromBlob(blob);
                    e.preventDefault();
                    return;
                }
            }
        }
    });

    // ファイル選択から画像を読み込み
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type.match('image.*')) {
                loadImageFromBlob(file);
            } else {
                alert('画像ファイルを選択してください。');
            }
        }
    });

    // 各設定の変更をリアルタイムで反映
    const fontSizeInput = document.getElementById('font-size-input');
    const fontSizeValue = document.getElementById('font-size-value');
    const textColorInput = document.getElementById('text-color');
    const bgColorInput = document.getElementById('bg-color');
    const bgEnabledInput = document.getElementById('bg-enabled');

    // テキスト設定の変更を監視して更新する関数
    function updateTextElement() {
        if (editingTextId === null) return;
        
        const textElement = textElements.find(el => el.id === editingTextId);
        if (!textElement) return;

        const fontSize = parseInt(fontSizeInput.value) || DEFAULT_FONT_SIZE;
        
        // 一時的な更新用のオブジェクトを作成
        const tempElement = {
            ...textElement,
            fontSize: fontSize,
            lineHeight: fontSize * 1.2,
            color: textColorInput.value,
            bgColor: bgEnabledInput.checked ? bgColorInput.value : null
        };

        // テキストの寸法を更新（既存のテキストで計算）
        ctx.font = `${fontSize}px sans-serif`;
        let maxWidth = 0;
        textElement.lines.forEach(line => {
            const metrics = ctx.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });

        tempElement.width = maxWidth;
        tempElement.height = tempElement.lineHeight * textElement.lines.length;

        // 一時的な要素を使用してプレビュー表示
        const originalElement = {...textElement};
        Object.assign(textElement, tempElement);
        updateCanvas();
        // プレビュー後、テキスト関連のプロパティを元に戻す
        textElement.text = originalElement.text;
        textElement.lines = originalElement.lines;

        updateCanvas();
    }

    // フォントサイズの変更を監視
    fontSizeInput.addEventListener('input', () => {
        fontSizeValue.textContent = fontSizeInput.value.padStart(3, '0');
        updateTextElement();
    });

    // 文字色の変更を監視
    textColorInput.addEventListener('input', updateTextElement);

    // 背景色の変更を監視
    bgColorInput.addEventListener('input', updateTextElement);

    // 背景色の有効/無効の変更を監視
    bgEnabledInput.addEventListener('change', updateTextElement);

    // デフォルト設定に戻すボタン
    const resetDefaultsBtn = document.getElementById('reset-defaults-btn');
    resetDefaultsBtn.addEventListener('click', () => {
        const fontSizeInput = document.getElementById('font-size-input');
        const textColor = document.getElementById('text-color');
        const bgColor = document.getElementById('bg-color');
        const bgEnabled = document.getElementById('bg-enabled');
        const fontSizeValue = document.getElementById('font-size-value');
        
        fontSizeInput.value = DEFAULT_FONT_SIZE;
        fontSizeValue.textContent = DEFAULT_FONT_SIZE.toString().padStart(3, '0');
        textColor.value = DEFAULT_TEXT_COLOR;
        bgColor.value = DEFAULT_BG_COLOR;
        bgEnabled.checked = DEFAULT_BG_ENABLED;
    });

    // テキスト適用ボタン
    applyTextBtn.addEventListener('click', () => {
        const text = textInput.value;  // トリムしない（改行を保持）
        const fontSizeInput = document.getElementById('font-size-input');
        const fontSize = parseInt(fontSizeInput.value) || DEFAULT_FONT_SIZE;
        const textColor = document.getElementById('text-color').value;
        const bgColor = document.getElementById('bg-color').value;
        const bgEnabled = document.getElementById('bg-enabled').checked;
        
        if (text) {
            if (editingTextId !== null) {
                // 既存のテキストを編集
                const textElement = textElements.find(el => el.id === editingTextId);
                if (textElement) {
                    // テキストの内容を更新
                    textElement.text = text;
                    textElement.color = textColor;
                    textElement.bgColor = bgEnabled ? bgColor : null;
                    textElement.fontSize = fontSize;
                    textElement.lineHeight = fontSize * 1.2;
                    
                    // 改行で分割して各行の幅を計算
                    const lines = text.split('\n');
                    textElement.lines = lines;
                    
                    // テキストの寸法を更新
                    ctx.font = `${fontSize}px sans-serif`;
                    let maxWidth = 0;
                    lines.forEach(line => {
                        const metrics = ctx.measureText(line);
                        maxWidth = Math.max(maxWidth, metrics.width);
                    });
                    
                    textElement.width = maxWidth;
                    textElement.height = textElement.lineHeight * lines.length;
                    
                    updateCanvas();
                }
                editingTextId = null;
            } else {
                // 新しいテキストを追加
                if (!image) {
                    alert('先に画像を読み込んでください。');
                    return;
                }
                addTextToCanvas(text);
            }
        }
        textInput.value = '';
        textInput.focus();
    });

    // テキスト入力キャンセルボタン
    cancelTextBtn.addEventListener('click', () => {
        cancelTextInput();
        editingTextId = null;
    });

    // 全テキスト削除ボタン
    clearAllBtn.addEventListener('click', () => {
        if (textElements.length > 0) {
            if (confirm('すべてのテキストを削除しますか？')) {
                textElements = [];
                selectedTextElement = null;
                updateCanvas();
            }
        }
    });

    // 画像保存ボタン
    saveBtn.addEventListener('click', () => {
        if (!image) {
            alert('画像が読み込まれていません。');
            return;
        }

        // キャンバス上のすべての要素を描画
        drawImageAndTexts();

        // 画像をダウンロード
        const link = document.createElement('a');
        link.download = 'screenshot-edited.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });

    // キャンバスのクリックイベント（テキスト選択）
    canvas.addEventListener('mousedown', (e) => {
        if (!image) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // スケール調整
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;

        // テキスト要素の選択チェック（後ろから前に）
        let found = false;
        for (let i = textElements.length - 1; i >= 0; i--) {
            const el = textElements[i];
            if (
                scaledX >= el.x &&
                scaledX <= el.x + el.width &&
                scaledY >= el.y &&
                scaledY <= el.y + el.height
            ) {
                // 現在のテキストが編集モードかチェック
                const isCurrentlyEditing = editingTextId === el.id;

                // ダブルクリックでテキスト編集
                if (e.detail === 2 && el === selectedTextElement) {
                    editingTextId = el.id;
                    textInput.value = el.text;
                    const fontSizeInput = document.getElementById('font-size-input');
                    const textColor = document.getElementById('text-color');
                    const bgColor = document.getElementById('bg-color');
                    const bgEnabled = document.getElementById('bg-enabled');
                    
                    fontSizeInput.value = el.fontSize;
                    fontSizeValue.textContent = el.fontSize.toString().padStart(3, '0');
                    textColor.value = el.color;
                    bgColor.value = el.bgColor || DEFAULT_BG_COLOR;
                    bgEnabled.checked = el.bgColor !== null;
                    textInput.focus();
                }

                // 他のテキストを選択した場合は編集モードをクリア
                if (editingTextId !== null && editingTextId !== el.id) {
                    editingTextId = null;
                    cancelTextInput();
                }

                // 選択状態を更新（編集中のテキスト以外の場合）
                if (!isCurrentlyEditing) {
                    selectedTextElement = el;
                }

                // ドラッグ開始（編集モード中でも移動可能）
                isDragging = true;
                dragOffsetX = scaledX - el.x;
                dragOffsetY = scaledY - el.y;

                // 選択したテキストを配列の最後に移動（前面表示）
                if (!isCurrentlyEditing) {
                    textElements = textElements.filter(item => item.id !== el.id);
                    textElements.push(el);
                }
                
                found = true;
                updateCanvas();
                break;
            }
        }

        if (!found) {
            // テキストの範囲外をクリックした場合
            selectedTextElement = null;
            editingTextId = null;
            cancelTextInput(); // テキスト入力欄をクリアして編集モードを解除
            updateCanvas();
        }
    });

    // マウス移動イベント（テキスト移動）
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging || !selectedTextElement) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // スケール調整
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;

        selectedTextElement.x = scaledX - dragOffsetX;
        selectedTextElement.y = scaledY - dragOffsetY;
        
        // キャンバス内に収める
        selectedTextElement.x = Math.max(0, Math.min(canvas.width - selectedTextElement.width, selectedTextElement.x));
        selectedTextElement.y = Math.max(0, Math.min(canvas.height - selectedTextElement.height, selectedTextElement.y));
        
        updateCanvas();
    });

    // マウスアップイベント（ドラッグ終了）
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // マウスがキャンバスから出た時
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // デリートキーでテキスト削除
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && selectedTextElement) {
            textElements = textElements.filter(el => el.id !== selectedTextElement.id);
            selectedTextElement = null;
            updateCanvas();
        }
    });
});

// Blobから画像を読み込む
function loadImageFromBlob(blob) {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    
    img.onload = () => {
        image = img;
        
        // キャンバスサイズを画像に合わせる
        canvas.width = img.width;
        canvas.height = img.height;
        
        // プレースホルダーを非表示にしてキャンバスを表示
        document.getElementById('placeholder-message').style.display = 'none';
        canvas.style.display = 'block';
        
        updateCanvas();
        URL.revokeObjectURL(url);
    };
    
    img.onerror = () => {
        alert('画像の読み込みに失敗しました。');
        URL.revokeObjectURL(url);
    };
    
    img.src = url;
}

// テキスト入力欄を準備
function prepareTextInput() {
    const textInput = document.getElementById('text-input');
    textInput.value = '';
    textInput.focus();
    isEditingText = true;
}

// テキスト入力をキャンセル
function cancelTextInput() {
    const textInput = document.getElementById('text-input');
    textInput.value = '';
    isEditingText = false;
}

// テキストをキャンバスに追加
function addTextToCanvas(text) {
    const fontSizeInput = document.getElementById('font-size-input');
    const fontSize = parseInt(fontSizeInput.value) || DEFAULT_FONT_SIZE;
    const textColor = document.getElementById('text-color').value;
    const bgColor = document.getElementById('bg-color').value;
    const bgEnabled = document.getElementById('bg-enabled').checked;
    
    // 改行で分割
    const lines = text.split('\n');
    
    ctx.font = `${fontSize}px sans-serif`;
    
    // 各行の幅を計算して最大幅を取得
    let maxWidth = 0;
    lines.forEach(line => {
        const metrics = ctx.measureText(line);
        maxWidth = Math.max(maxWidth, metrics.width);
    });
    
    // 高さは行数 × 行の高さ
    const lineHeight = fontSize * 1.2;
    const textHeight = lineHeight * lines.length;
    
    const newText = {
        id: Date.now().toString(),
        text: text,
        lines: lines,
        x: (canvas.width - maxWidth) / 2,
        y: (canvas.height - textHeight) / 2,
        width: maxWidth,
        height: textHeight,
        fontSize: fontSize,
        lineHeight: lineHeight,
        color: textColor,
        bgColor: bgEnabled ? bgColor : null
    };
    
    textElements.push(newText);
    selectedTextElement = newText;
    updateCanvas();
}

// キャンバスの更新
function updateCanvas() {
    drawImageAndTexts();
}

// HEXカラーをRGBA形式に変換
function hexToRgba(hex, alpha) {
    // #を取り除く
    hex = hex.replace('#', '');
    
    // 16進数をRGB値に変換
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // RGBA形式の文字列を返す
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 画像とテキストを描画
function drawImageAndTexts() {
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 画像を描画
    if (image) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
    
    // テキストを描画
    textElements.forEach(el => {
        ctx.font = `${el.fontSize}px sans-serif`;
        ctx.fillStyle = el.color;
        
        // 改行対応テキスト描画
        if (el.lines) {
            // 複数行テキスト
            el.lines.forEach((line, index) => {
                const y = el.y + (index * el.lineHeight) + el.fontSize;
                const padding = el.fontSize * 0.2;
                
                // 背景を描画（50%透明度）
                if (el.bgColor) {
                    const bgColor = hexToRgba(el.bgColor, 0.5); // 50%透明度
                    ctx.fillStyle = bgColor;
                    
                    // 各行の幅を計算
                    const metrics = ctx.measureText(line);
                    const lineWidth = metrics.width;
                    
                    // 背景を描画
                    ctx.fillRect(
                        el.x - padding, 
                        y - el.fontSize + padding, 
                        lineWidth + padding * 2, 
                        el.fontSize + padding
                    );
                }
                
                // テキストを描画
                ctx.fillStyle = el.color;
                ctx.fillText(line, el.x, y);
            });
        } else {
            // 後方互換性のため、古いテキスト形式もサポート
            // 背景を描画（50%透明度）
            if (el.bgColor) {
                const bgColor = hexToRgba(el.bgColor, 0.5); // 50%透明度
                ctx.fillStyle = bgColor;
                const padding = el.fontSize * 0.2;
                ctx.fillRect(
                    el.x - padding, 
                    el.y - padding, 
                    el.width + padding * 2, 
                    el.height + padding
                );
            }
            
            // テキストを描画
            ctx.fillStyle = el.color;
            ctx.fillText(el.text, el.x, el.y + el.fontSize);
        }
        
        // 選択されたテキストに枠を表示
        if (selectedTextElement && el.id === selectedTextElement.id) {
            if (editingTextId === el.id) {
                // 編集モード時の枠のスタイル（オレンジ色の点線）
                ctx.strokeStyle = '#ff9900';
                ctx.setLineDash([5, 3]);
                ctx.lineWidth = 2;
                ctx.strokeRect(el.x - 4, el.y - 4, el.width + 8, el.height + 8);
                ctx.setLineDash([]); // 点線をリセット
            } else {
                // 選択モード時の枠のスタイル（青色の実線）
                ctx.strokeStyle = '#3498db';
                ctx.lineWidth = 2;
                ctx.strokeRect(el.x - 2, el.y - 2, el.width + 4, el.height + 4);
            }
        }
    });
}
