import { Editor, MarkdownView, Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { EditorView } from '@codemirror/view';
import {
	DEFAULT_SETTINGS,
	SideCommentsSettings,
	SideCommentsSettingTab,
} from './settings';
import { CommentStore } from './store';
import { SideComment } from './types';
import {
	createCommentHighlightExtension,
	refreshCommentsEffect,
} from './editor/extension';
import { getAppStrings } from './i18n';
import { CommentPopover } from './ui/comment-popover';
import {
	SideCommentsView,
	VIEW_TYPE_SIDE_COMMENTS,
} from './ui/sidebar-view';
import { registerCommands } from './commands/register';

export default class SideCommentsPlugin extends Plugin {
	settings!: SideCommentsSettings;
	store!: CommentStore;

	async onload() {
		// Инициализация хранилища
		this.store = new CommentStore(this);
		await this.store.load();

		// Загрузка настроек
		await this.loadSettings();

		// Регистрация CodeMirror 6 расширения
		// ViewPlugin сам читает комментарии из хранилища при каждом обновлении
		this.registerEditorExtension(
			createCommentHighlightExtension({
				getComments: () => {
					const file = this.app.workspace.getActiveFile();
					if (!file) return [];
					return this.store.getComments(file.path);
				},
				showMarker: () => this.settings.showMarker,
			}),
		);

		// Регистрация сайдбар-представления
		this.registerView(
			VIEW_TYPE_SIDE_COMMENTS,
			(leaf: WorkspaceLeaf) => new SideCommentsView(leaf, this),
		);

		// Иконка в ribbon для открытия сайдбара
		this.addRibbonIcon('message-square', getAppStrings().commandOpenSidebar, () => {
			void this.activateSidebar();
		});

		// Команды и контекстное меню
		registerCommands(this);

		// Команда для открытия сайдбара
		this.addCommand({
			id: 'open-side-comments-view',
			name: getAppStrings().commandOpenSidebar,
			callback: () => {
				void this.activateSidebar();
			},
		});

		// Обновление декораций при смене активного файла
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.refreshEditorExtensions();
			}),
		);

		// Обработка кликов по маркерам комментариев в редакторе
		const clickHandler = (e: Event) => {
			const detail = (e as CustomEvent).detail as { commentId: string };
			if (detail?.commentId) {
				this.openCommentEditor(detail.commentId);
			}
		};
		activeDocument.addEventListener('side-comment-click', clickHandler);
		this.register(() => {
			activeDocument.removeEventListener('side-comment-click', clickHandler);
		});

		// Настройки
		this.addSettingTab(new SideCommentsSettingTab(this.app, this));

		// Первичное обновление декораций
		this.refreshEditorExtensions();
	}

	onunload() {
		// Не вызываем detachLeavesOfType, чтобы не сбрасывать позицию панели
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SideCommentsSettings>,
		);
	}

	async saveSettings() {
		const data = (await this.loadData()) as { comments?: unknown } | null;
		await this.saveData({
			comments: data?.comments,
			...this.settings,
		});
	}

	/**
	 * Обновить декорации CodeMirror для текущего активного файла.
	 * ViewPlugin пересчитывает декорации при изменениях документа,
	 * но для немедленного обновления (после добавления/удаления комментария)
	 * отправляем эффект refreshCommentsEffect.
	 */
	refreshEditorExtensions() {
		// Обновить сайдбар
		this.refreshSidebar();

		// Принудительно обновить декорации во всех открытых редакторах
		this.app.workspace.iterateAllLeaves((leaf) => {
			const view = leaf.view;
			if (view instanceof MarkdownView) {
				const editorView = this.getEditorView(view);
				if (editorView) {
					editorView.dispatch({
						effects: refreshCommentsEffect.of(),
					});
				}
			}
		});
	}

	/**
	 * Получить EditorView (CodeMirror 6) из MarkdownView.
	 */
	private getEditorView(view: MarkdownView): EditorView | null {
		// Пытаемся получить EditorView разными способами
		const editor = view.editor as unknown as {
			cm?: EditorView;
			editorComponent?: { cmView?: { view?: EditorView } };
		};
		if (editor.cm) return editor.cm;
		if (editor.editorComponent?.cmView?.view) {
			return editor.editorComponent.cmView.view;
		}
		return null;
	}

	/**
	 * Активировать боковую панель с комментариями.
	 */
	async activateSidebar() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_SIDE_COMMENTS);
		if (existing.length > 0) {
			leaf = existing[0] ?? null;
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_SIDE_COMMENTS,
					active: true,
				});
			}
		}
		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Обновить содержимое сайдбара.
	 */
	refreshSidebar() {
		const leaves = this.app.workspace.getLeavesOfType(
			VIEW_TYPE_SIDE_COMMENTS,
		);
		for (const leaf of leaves) {
			const view = leaf.view;
			if (view instanceof SideCommentsView) {
				view.renderList();
			}
		}
	}

	/**
	 * Добавить комментарий к текущему выделению в редакторе.
	 */
	addCommentFromSelection(editor: Editor) {
		const t = getAppStrings();
		const selection = editor.getSelection();
		if (!selection || selection.length === 0) {
			new Notice(t.noticeSelectText);
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice(t.noticeNoFile);
			return;
		}

		const from = editor.getCursor('from');
		const to = editor.getCursor('to');
		const fromOffset = editor.posToOffset(from);
		const toOffset = editor.posToOffset(to);

		// Проверка пересечения с существующими комментариями
		const existing = this.store.getComments(activeFile.path);
		const overlapping = existing.find(
			(c) => fromOffset < c.to && toOffset > c.from,
		);
		if (overlapping) {
			// Если выделение точно совпадает с существующим комментарием — открыть редактор
			if (overlapping.from === fromOffset && overlapping.to === toOffset) {
				this.openCommentEditor(overlapping.id);
				return;
			}
			new Notice(t.noticeOverlap);
			this.openCommentEditor(overlapping.id);
			return;
		}

		const newComment: SideComment = {
			id: crypto.randomUUID(),
			file: activeFile.path,
			from: fromOffset,
			to: toOffset,
			text: selection,
			comment: '',
			createdAt: Date.now(),
			updatedAt: Date.now(),
		};

		new CommentPopover(this.app, {
			existingComment: null,
			strings: t,
			onSave: (text: string) => {
				newComment.comment = text;
				void this.store.addComment(newComment).then(() => {
					this.refreshEditorExtensions();
					if (this.settings.sidebarDefaultOpen) {
						void this.activateSidebar();
					}
				});
			},
		}).open();
	}

	/**
	 * Открыть редактор существующего комментария.
	 */
	openCommentEditor(commentId: string) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;

		const comment = this.store.getComment(activeFile.path, commentId);
		if (!comment) return;

		const t = getAppStrings();

		new CommentPopover(this.app, {
			existingComment: comment,
			strings: t,
			onSave: (text: string) => {
				void this.store
					.updateComment(activeFile.path, commentId, {
						comment: text,
					})
					.then(() => {
						this.refreshEditorExtensions();
					});
			},
			onDelete: () => {
				void this.deleteComment(commentId);
			},
		}).open();
	}

	/**
	 * Удалить комментарий по ID.
	 */
	async deleteComment(commentId: string) {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return;
		await this.store.deleteComment(activeFile.path, commentId);
		this.refreshEditorExtensions();
	}

	/**
	 * Прокрутить к выделению комментария в редакторе.
	 * Если сохранённые смещения некорректны, выполняет поиск по тексту.
	 */
	navigateToComment(commentId: string) {

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			return;
		}

		const comment = this.store.getComment(activeFile.path, commentId);
		if (!comment) {
			return;
		}



		// Ищем MarkdownView среди всех листьев, а не только активного,
		// т.к. при клике в сайдбар активный view — это сайдбар
		const foundViews: MarkdownView[] = [];
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const file = leaf.view.file;
				if (file && file.path === activeFile.path) {
					foundViews.push(leaf.view);
				}
			}
		});

		if (foundViews.length === 0) {
			return;
		}

		const editor = foundViews[0]!.editor;
		const docLength = editor.getValue().length;

		// Проверяем, что смещения валидны
		let fromOffset = comment.from;
		let toOffset = comment.to;

		if (fromOffset > docLength || toOffset > docLength) {
			// Смещения некорректны — ищем по сохранённому тексту
			const fullText = editor.getValue();
			const idx = fullText.indexOf(comment.text);
			if (idx === -1) {
				new Notice('Comment location not found');
				return;
			}
			fromOffset = idx;
			toOffset = idx + comment.text.length;
		}

		const fromPos = editor.offsetToPos(fromOffset);
		const toPos = editor.offsetToPos(toOffset);


		// Устанавливаем фокус на редактор
		editor.focus();

		// Устанавливаем выделение (опционально) и прокручиваем
		if (this.settings.selectOnNavigate) {
			editor.setSelection(fromPos, toPos);
		} else {
			editor.setCursor(fromPos);
		}
		editor.scrollIntoView({
			from: fromPos,
			to: toPos,
		});
	}
}
