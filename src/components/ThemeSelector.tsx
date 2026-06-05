import { useTheme } from '../themes';
import { t } from '../i18n/zh';
import styles from './ThemeSelector.module.css';

export function ThemeSelector() {
  const { themeName, setTheme, availableThemes } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value);
  };

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="theme-selector">
        {t('theme.label')}
      </label>
      <select
        id="theme-selector"
        className={styles.select}
        value={themeName}
        onChange={handleChange}
      >
        {availableThemes.map((theme) => (
          <option key={theme.name} value={theme.name}>
            {theme.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ThemeSelector;
