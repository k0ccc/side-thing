import { ItemView, WorkspaceLeaf } from 'obsidian';
import type SideCommentsPlugin from '../main';
import { getAppStrings } from '../i18n';

export const VIEW_TYPE_SIDE_COMMENTS = 'side-comments-view';

/**
 * Боковая панель со списком всех комментариев текущей заметки.
 * Клик по комментарию прокручивает к выделению в редакторе.
 */
export class SideCommentsView extends ItemView {
	plugin: SideCommentsPlugin;
	private listEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: SideCommentsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_SIDE_COMMENTS;
	}

	getDisplayText() {
		return getAppStrings().sidebarTitle;
	}

	getIcon() {
		return 'message-square';
	}

	async onOpen() {
		const { containerEl } = this;
		containerEl.empty();

		const t = getAppStrings();

		const header = containerEl.createDiv({
			cls: 'side-comments-view-header',
		});
		header.createEl('h4', { text: t.sidebarTitle });

		this.listEl = containerEl.createDiv({
			cls: 'side-comments-view-list',
		});

		this.renderList();

		// Обновление при смене активного файла
		this.registerEvent(
			this.app.workspace.on('file-open', () => {
				this.renderList();
			}),
		);

		// Обновление при сохранении
		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.renderList();
			}),
		);
	}

	async onClose() {
		const { containerEl } = this;
		containerEl.empty();
	}

	/** Перерисовать список комментариев. */
	renderList() {
		if (!this.listEl) return;
		this.listEl.empty();

		const t = getAppStrings();

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			this.listEl.createDiv({
				text: t.sidebarNoFile,
				cls: 'side-comments-view-empty',
			});
			return;
		}

		const comments = this.plugin.store.getComments(activeFile.path);

		if (comments.length === 0) {
			this.listEl.createDiv({
				text: t.sidebarEmpty,
				cls: 'side-comments-view-empty',
			});
			return;
		}

		// Сортировка по позиции в документе
		const sorted = [...comments].sort((a, b) => a.from - b.from);

		for (const comment of sorted) {
			const item = this.listEl.createDiv({
				cls: 'side-comments-view-item',
			});
			item.setAttribute('data-comment-id', comment.id);

			const quote = item.createDiv({
				cls: 'side-comments-view-item-quote',
			});
			quote.createSpan({
				text: comment.text,
				cls: 'side-comments-view-item-quote-text',
			});

			item.createDiv({
				cls: 'side-comments-view-item-body',
				text: comment.comment,
			});

			const meta = item.createDiv({
				cls: 'side-comments-view-item-meta',
			});
			const date = new Date(comment.updatedAt);
			meta.createSpan({
				text: date.toLocaleString(),
				cls: 'side-comments-view-item-date',
			});

			const actions = item.createDiv({
				cls: 'side-comments-view-item-actions',
			});

			const editBtn = actions.createEl('button', {
				text: t.sidebarEdit,
				cls: 'side-comments-view-item-btn',
			});
			editBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				this.plugin.openCommentEditor(comment.id);
			});

			const deleteBtn = actions.createEl('button', {
				text: t.sidebarDelete,
				cls: 'side-comments-view-item-btn side-comments-view-item-delete',
			});
			deleteBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				void this.plugin.deleteComment(comment.id);
			});

			// Клик по элементу — прокрутка к выделению
			item.addEventListener('click', () => {
				this.plugin.navigateToComment(comment.id);
			});
		}
	}
}
