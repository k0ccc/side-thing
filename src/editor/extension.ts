import {
	EditorView,
	Decoration,
	DecorationSet,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from '@codemirror/view';
import { StateEffect } from '@codemirror/state';
import type { SideComment } from '../types';

/**
 * Эффект для принудительного обновления декораций.
 */
export const refreshCommentsEffect = StateEffect.define<void>();

/**
 * Конфигурация для получения комментариев и настроек.
 */
export interface CommentsConfig {
	getComments: () => SideComment[];
	showMarker: () => boolean;
}

/**
 * Виджет-маркер, указывающий на наличие комментария.
 * Использует SVG-иконку в стиле Obsidian (Lucide message-square).
 */
class CommentMarkerWidget extends WidgetType {
	constructor(readonly commentId: string) {
		super();
	}

	toDOM() {
		const span = createSpan({
			cls: 'side-comment-marker',
			attr: { 'data-comment-id': this.commentId },
		});
		const svg = document.createElementNS(
			'http://www.w3.org/2000/svg',
			'svg',
		);
		svg.setAttribute('width', '16');
		svg.setAttribute('height', '16');
		svg.setAttribute('viewBox', '0 0 24 24');
		svg.setAttribute('fill', 'none');
		svg.setAttribute('stroke', 'currentColor');
		svg.setAttribute('stroke-width', '2');
		svg.setAttribute('stroke-linecap', 'round');
		svg.setAttribute('stroke-linejoin', 'round');
		const path = document.createElementNS(
			'http://www.w3.org/2000/svg',
			'path',
		);
		path.setAttribute(
			'd',
			'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
		);
		svg.appendChild(path);
		span.appendChild(svg);
		return span;
	}

	ignoreEvent() {
		return false;
	}
}

/**
 * Создаёт набор декораций из списка комментариев.
 */
function buildDecorations(
	config: CommentsConfig,
	docLength: number,
): DecorationSet {
	const comments = config.getComments();
	const showMarker = config.showMarker();

	const decorations: { from: number; to: number; deco: Decoration }[] = [];
	for (const c of comments) {
		// Проверяем, что смещения валидны
		if (c.from > docLength || c.to > docLength || c.from >= c.to) {
			continue;
		}
		decorations.push({
			from: c.from,
			to: c.to,
			deco: Decoration.mark({
				class: 'side-comment-highlight',
				attributes: { 'data-comment-id': c.id },
			}),
		});
		if (showMarker) {
			decorations.push({
				from: c.to,
				to: c.to,
				deco: Decoration.widget({
					widget: new CommentMarkerWidget(c.id),
				}),
			});
		}
	}
	return Decoration.set(
		decorations.map((d) => d.deco.range(d.from, d.to)),
		true,
	);
}

/**
 * Создаёт расширение CodeMirror 6 для подсветки комментариев.
 * ViewPlugin хранит DecorationSet и пересчитывает его при изменениях
 * документа или при явном запросе (через обновление view).
 */
export function createCommentHighlightExtension(
	config: CommentsConfig,
) {
	const plugin = ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			view: EditorView;
			handleClick: (event: MouseEvent) => void;

			constructor(view: EditorView) {
				this.view = view;
				this.decorations = buildDecorations(
					config,
					view.state.doc.length,
				);
				this.handleClick = (event: MouseEvent) => {
					const target = event.target as HTMLElement;
					const marker = target.closest('.side-comment-marker');
					if (marker) {
						const commentId = marker.getAttribute('data-comment-id');
						if (commentId) {
							event.preventDefault();
							this.view.dom.dispatchEvent(
								new CustomEvent('side-comment-click', {
									detail: { commentId },
									bubbles: true,
								}),
							);
						}
					}
				};
				view.dom.addEventListener('click', this.handleClick);
			}

			update(update: ViewUpdate) {
				// Пересчитываем декорации при изменении документа, viewport
				// или при явном запросе обновления
				const hasRefresh = update.transactions.some((tr) =>
					tr.effects.some((e) => e.is(refreshCommentsEffect)),
				);
				if (update.docChanged || update.viewportChanged || hasRefresh) {
					this.decorations = buildDecorations(
						config,
						update.state.doc.length,
					);
				}
			}

			destroy() {
				this.view.dom.removeEventListener('click', this.handleClick);
			}
		},
		{
			decorations: (v) => v.decorations,
		},
	);

	return [plugin];
}
