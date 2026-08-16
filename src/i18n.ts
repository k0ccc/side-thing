/**
 * Локализация плагина.
 * Язык по умолчанию — английский, с переводом на русский.
 */

export type Language = 'en' | 'ru';

export interface Strings {
	// Настройки
	settingsHighlightColor: string;
	settingsHighlightColorDesc: string;
	settingsShowMarker: string;
	settingsShowMarkerDesc: string;
	settingsSelectOnNavigate: string;
	settingsSelectOnNavigateDesc: string;
	settingsOpenSidebar: string;
	settingsOpenSidebarDesc: string;
	settingsLanguage: string;
	settingsLanguageDesc: string;

	// Команды
	commandAddComment: string;
	commandOpenSidebar: string;

	// Попап
	popoverAddTitle: string;
	popoverEditTitle: string;
	popoverPlaceholder: string;
	popoverSave: string;
	popoverCancel: string;
	popoverDelete: string;

	// Сайдбар
	sidebarTitle: string;
	sidebarNoFile: string;
	sidebarEmpty: string;
	sidebarEdit: string;
	sidebarDelete: string;

	// Уведомления
	noticeSelectText: string;
	noticeNoFile: string;
	noticeOverlap: string;
	noticeNotFound: string;

	// Контекстное меню
	menuAddComment: string;
}

const en: Strings = {
	settingsHighlightColor: 'Highlight color',
	settingsHighlightColorDesc: 'Color of highlighted text fragments with comments.',
	settingsShowMarker: 'Show marker',
	settingsShowMarkerDesc: 'Show comment marker at the end of highlighted text.',
	settingsSelectOnNavigate: 'Select text on navigate',
	settingsSelectOnNavigateDesc: 'Select the highlighted text when navigating to a comment.',
	settingsOpenSidebar: 'Open sidebar on add',
	settingsOpenSidebarDesc: 'Automatically open the sidebar when adding a comment.',
	settingsLanguage: 'Language',
	settingsLanguageDesc: 'Interface language for the plugin.',

	commandAddComment: 'Add side comment',
	commandOpenSidebar: 'Open comments sidebar',

	popoverAddTitle: 'Add comment',
	popoverEditTitle: 'Edit comment',
	popoverPlaceholder: 'Write your comment...',
	popoverSave: 'Save',
	popoverCancel: 'Cancel',
	popoverDelete: 'Delete',

	sidebarTitle: 'Comments',
	sidebarNoFile: 'No active file',
	sidebarEmpty: 'No comments yet. Select text and add a comment.',
	sidebarEdit: 'Edit',
	sidebarDelete: 'Delete',

	noticeSelectText: 'Select text to comment on first',
	noticeNoFile: 'No active file',
	noticeOverlap: 'This selection overlaps with an existing comment. Edit it instead.',
	noticeNotFound: 'Comment location not found',

	menuAddComment: 'Add side comment',
};

const ru: Strings = {
	settingsHighlightColor: 'Цвет подсветки',
	settingsHighlightColorDesc: 'Цвет подсветки выделенных фрагментов с комментариями.',
	settingsShowMarker: 'Показывать маркер',
	settingsShowMarkerDesc: 'Показывать маркер комментария в конце выделения.',
	settingsSelectOnNavigate: 'Выделять текст при переходе',
	settingsSelectOnNavigateDesc: 'Выделять подсвеченный текст при переходе к комментарию.',
	settingsOpenSidebar: 'Открывать панель при добавлении',
	settingsOpenSidebarDesc: 'Автоматически открывать боковую панель при добавлении комментария.',
	settingsLanguage: 'Язык',
	settingsLanguageDesc: 'Язык интерфейса плагина.',

	commandAddComment: 'Добавить комментарий',
	commandOpenSidebar: 'Открыть панель комментариев',

	popoverAddTitle: 'Добавить комментарий',
	popoverEditTitle: 'Редактировать комментарий',
	popoverPlaceholder: 'Напишите комментарий...',
	popoverSave: 'Сохранить',
	popoverCancel: 'Отмена',
	popoverDelete: 'Удалить',

	sidebarTitle: 'Комментарии',
	sidebarNoFile: 'Нет активного файла',
	sidebarEmpty: 'Пока нет комментариев. Выделите текст и добавьте комментарий.',
	sidebarEdit: 'Изменить',
	sidebarDelete: 'Удалить',

	noticeSelectText: 'Сначала выделите текст для комментария',
	noticeNoFile: 'Нет активного файла',
	noticeOverlap: 'Это выделение пересекается с существующим комментарием. Отредактируйте его.',
	noticeNotFound: 'Местоположение комментария не найдено',

	menuAddComment: 'Добавить комментарий',
};

const translations: Record<Language, Strings> = { en, ru };

/**
 * Получить строки локализации для указанного языка.
 */
export function getStrings(lang: Language): Strings {
	return translations[lang] ?? translations.en;
}

/**
 * Определить язык интерфейса из настроек Obsidian.
 * Использует moment.locale(), который возвращает текущий язык Obsidian.
 */
export function getLanguage(): Language {
	const locale = (window.moment?.locale?.() ?? 'en').toLowerCase();
	if (locale.startsWith('ru')) {
		return 'ru';
	}
	return 'en';
}

/**
 * Получить строки локализации для текущего языка Obsidian.
 */
export function getAppStrings(): Strings {
	return getStrings(getLanguage());
}
