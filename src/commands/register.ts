import { Editor, MarkdownView, MarkdownFileInfo, Menu } from 'obsidian';
import type SideCommentsPlugin from '../main';
import { getAppStrings } from '../i18n';

/**
 * Регистрация команды добавления комментария и пункта контекстного меню.
 */
export function registerCommands(plugin: SideCommentsPlugin): void {
	const t = getAppStrings();

	// Команда: добавить комментарий к выделению
	plugin.addCommand({
		id: 'add-side-comment',
		name: t.commandAddComment,
		editorCallback: (
			editor: Editor,
			_ctx: MarkdownView | MarkdownFileInfo,
		) => {
			plugin.addCommentFromSelection(editor);
		},
	});

	// Пункт контекстного меню (ПКМ)
	plugin.registerEvent(
		plugin.app.workspace.on(
			'editor-menu',
			(menu: Menu, editor: Editor) => {
				const selection = editor.getSelection();
				if (selection && selection.length > 0) {
					const currentT = getAppStrings();
					menu.addItem((item) => {
						item
							.setTitle(currentT.menuAddComment)
							.setIcon('message-square')
							.onClick(() => {
								plugin.addCommentFromSelection(editor);
							});
					});
				}
			},
		),
	);
}
