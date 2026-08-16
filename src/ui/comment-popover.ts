import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import type { SideComment } from '../types';
import type { Strings } from '../i18n';

/**
 * Floating-попап для создания или редактирования комментария.
 * Открывается как модальное окно, но стилизовано как попап рядом с выделением.
 */
export class CommentPopover extends Modal {
	private textarea: HTMLTextAreaElement | null = null;
	private onSave: (text: string) => void;
	private onDelete: (() => void) | null;
	private existingComment: SideComment | null;
	private t: Strings;

	constructor(
		app: App,
		opts: {
			initialText?: string;
			existingComment?: SideComment | null;
			onSave: (text: string) => void;
			onDelete?: () => void;
			strings: Strings;
		},
	) {
		super(app);
		this.onSave = opts.onSave;
		this.onDelete = opts.onDelete ?? null;
		this.existingComment = opts.existingComment ?? null;
		this.t = opts.strings;
	}

	onOpen() {
		const { contentEl, modalEl } = this;
		modalEl.addClass('side-comment-popover');
		contentEl.empty();

		const header = contentEl.createDiv({
			cls: 'side-comment-popover-header',
		});
		header.createSpan({
			text: this.existingComment ? this.t.popoverEditTitle : this.t.popoverAddTitle,
			cls: 'side-comment-popover-title',
		});

		if (this.existingComment) {
			const quote = contentEl.createDiv({
				cls: 'side-comment-popover-quote',
			});
			quote.createSpan({
				text: this.existingComment.text,
				cls: 'side-comment-popover-quote-text',
			});
		}

		this.textarea = contentEl.createEl('textarea', {
			cls: 'side-comment-popover-textarea',
		});
		this.textarea.placeholder = this.t.popoverPlaceholder;
		if (this.existingComment) {
			this.textarea.value = this.existingComment.comment;
		}

		const actions = contentEl.createDiv({
			cls: 'side-comment-popover-actions',
		});

		if (this.onDelete) {
			const deleteBtn = actions.createEl('button', {
				text: this.t.popoverDelete,
				cls: 'side-comment-popover-btn side-comment-popover-delete',
			});
			deleteBtn.addEventListener('click', () => {
				this.onDelete?.();
				this.close();
			});
		}

		const cancelBtn = actions.createEl('button', {
			text: this.t.popoverCancel,
			cls: 'side-comment-popover-btn side-comment-popover-cancel',
		});
		cancelBtn.addEventListener('click', () => {
			this.close();
		});

		const saveBtn = actions.createEl('button', {
			text: this.t.popoverSave,
			cls: 'side-comment-popover-btn side-comment-popover-save mod-cta',
		});
		saveBtn.addEventListener('click', () => {
			const text = this.textarea?.value.trim() ?? '';
			if (text.length > 0) {
				this.onSave(text);
			}
			this.close();
		});

		// Сохранение по Ctrl/Cmd+Enter
		this.textarea.addEventListener('keydown', (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
				e.preventDefault();
				saveBtn.click();
			}
		});

		// Фокус на textarea
		window.setTimeout(() => {
			this.textarea?.focus();
		}, 50);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
