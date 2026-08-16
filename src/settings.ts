import { App, PluginSettingTab, Setting } from 'obsidian';
import SideCommentsPlugin from './main';
import { getAppStrings } from './i18n';

export interface SideCommentsSettings {
	/** Цвет подсветки выделенных фрагментов. */
	highlightColor: string;
	/** Автоматически открывать сайдбар при добавлении комментария. */
	sidebarDefaultOpen: boolean;
	/** Показывать маркер комментария в конце выделения. */
	showMarker: boolean;
	/** Выделять текст при переходе к комментарию. */
	selectOnNavigate: boolean;
}

export const DEFAULT_SETTINGS: SideCommentsSettings = {
	highlightColor: 'rgba(255, 213, 79, 0.3)',
	sidebarDefaultOpen: true,
	showMarker: true,
	selectOnNavigate: true,
};

export class SideCommentsSettingTab extends PluginSettingTab {
	plugin: SideCommentsPlugin;

	constructor(app: App, plugin: SideCommentsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		const t = getAppStrings();

		containerEl.empty();

		// Парсим текущий цвет на hex и alpha
		const currentColor = this.plugin.settings.highlightColor;
		const rgbaMatch = currentColor.match(
			/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/,
		);
		const r = rgbaMatch?.[1] ? parseInt(rgbaMatch[1]) : 255;
		const g = rgbaMatch?.[2] ? parseInt(rgbaMatch[2]) : 213;
		const b = rgbaMatch?.[3] ? parseInt(rgbaMatch[3]) : 79;
		const a = rgbaMatch?.[4] ? parseFloat(rgbaMatch[4]) : 0.3;
		const hexColor = `#${r.toString(16).padStart(2, '0')}${g
			.toString(16)
			.padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

		const colorSetting = new Setting(containerEl)
			.setName(t.settingsHighlightColor)
			.setDesc(t.settingsHighlightColorDesc);

		// Color picker (hex)
		colorSetting.addColorPicker((picker) =>
			picker
				.setValue(hexColor)
				.onChange(async (value) => {
					// value — hex, конвертируем в rgba с текущей прозрачностью
					const hex = value.replace('#', '');
					const newR = parseInt(hex.substring(0, 2), 16);
					const newG = parseInt(hex.substring(2, 4), 16);
					const newB = parseInt(hex.substring(4, 6), 16);
					this.plugin.settings.highlightColor = `rgba(${newR}, ${newG}, ${newB}, ${a})`;
					await this.plugin.saveSettings();
					this.plugin.refreshEditorExtensions();
					// Обновляем текстовое поле
					if (textInput) textInput.value = this.plugin.settings.highlightColor;
					opacitySlider.value = String(a);
				}),
		);

		// Текстовое поле для rgba
		let textInput: HTMLInputElement | null = null;
		colorSetting.addText((text) => {
			textInput = text.inputEl;
			text
				.setPlaceholder('rgba(255, 213, 79, 0.3)')
				.setValue(this.plugin.settings.highlightColor)
				.onChange(async (value) => {
					this.plugin.settings.highlightColor = value;
					await this.plugin.saveSettings();
					this.plugin.refreshEditorExtensions();
				});
		});

		// Ползунок прозрачности
		const opacityContainer = colorSetting.controlEl.createDiv({
			cls: 'side-comment-opacity-slider',
		});
		const opacitySlider = opacityContainer.createEl('input', {
			type: 'range',
		});
		opacitySlider.min = '0';
		opacitySlider.max = '1';
		opacitySlider.step = '0.05';
		opacitySlider.value = String(a);
		opacitySlider.addEventListener('input', () => {
			const newAlpha = parseFloat(opacitySlider.value);
			// Пересобираем rgba из hex color picker
			const hex = hexColor.replace('#', '');
			const newR = parseInt(hex.substring(0, 2), 16);
			const newG = parseInt(hex.substring(2, 4), 16);
			const newB = parseInt(hex.substring(4, 6), 16);
			this.plugin.settings.highlightColor = `rgba(${newR}, ${newG}, ${newB}, ${newAlpha})`;
			void this.plugin.saveSettings().then(() => {
				this.plugin.refreshEditorExtensions();
				if (textInput) textInput.value = this.plugin.settings.highlightColor;
			});
		});

		new Setting(containerEl)
			.setName(t.settingsShowMarker)
			.setDesc(t.settingsShowMarkerDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showMarker)
					.onChange(async (value) => {
						this.plugin.settings.showMarker = value;
						await this.plugin.saveSettings();
						this.plugin.refreshEditorExtensions();
					}),
			);

		new Setting(containerEl)
			.setName(t.settingsSelectOnNavigate)
			.setDesc(t.settingsSelectOnNavigateDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.selectOnNavigate)
					.onChange(async (value) => {
						this.plugin.settings.selectOnNavigate = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t.settingsOpenSidebar)
			.setDesc(t.settingsOpenSidebarDesc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.sidebarDefaultOpen)
					.onChange(async (value) => {
						this.plugin.settings.sidebarDefaultOpen = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
