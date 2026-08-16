import type { Plugin } from 'obsidian';
import type { CommentsStore, SideComment } from './types';

/**
 * Обёртка над loadData/saveData для управления комментариями.
 * Хранит данные в data.json, ключ — путь к файлу.
 */
export class CommentStore {
	private plugin: Plugin;
	private cache: CommentsStore = {};

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	/** Загрузить все комментарии из data.json. */
	async load(): Promise<void> {
		const data = (await this.plugin.loadData()) as Partial<{
			comments: CommentsStore;
		}>;
		this.cache = data?.comments ?? {};
	}

	/** Сохранить все комментарии в data.json. */
	async save(): Promise<void> {
		await this.plugin.saveData({ comments: this.cache });
	}

	/** Получить все комментарии для указанного файла. */
	getComments(filePath: string): SideComment[] {
		return this.cache[filePath] ?? [];
	}

	/** Добавить новый комментарий. */
	async addComment(comment: SideComment): Promise<void> {
		const list = this.cache[comment.file] ?? [];
		list.push(comment);
		this.cache[comment.file] = list;
		await this.save();
	}

	/** Обновить существующий комментарий по ID. */
	async updateComment(
		filePath: string,
		id: string,
		updates: Partial<SideComment>,
	): Promise<void> {
		const list = this.cache[filePath];
		if (!list) return;
		const idx = list.findIndex((c) => c.id === id);
		if (idx === -1) return;
		list[idx] = { ...list[idx], ...updates, updatedAt: Date.now() } as SideComment;
		await this.save();
	}

	/** Удалить комментарий по ID. */
	async deleteComment(filePath: string, id: string): Promise<void> {
		const list = this.cache[filePath];
		if (!list) return;
		this.cache[filePath] = list.filter((c) => c.id !== id);
		if (this.cache[filePath].length === 0) {
			delete this.cache[filePath];
		}
		await this.save();
	}

	/** Получить комментарий по ID для указанного файла. */
	getComment(filePath: string, id: string): SideComment | undefined {
		return this.cache[filePath]?.find((c) => c.id === id);
	}
}
