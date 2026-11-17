import en from '../../../assets/config.json';
import zh from '../../../assets/config.zh.json';
import hk from '../../../assets/config.hk.json';
import mx from '../../../assets/config.mx.json';
import nl from '../../../assets/config.nl.json';

// config.zh.json must mirror config.json: same keys in the same places and the
// same list lengths, so a component never meets a field in one language that
// the other lacks. Only text differs; URLs and image paths stay identical.
function compare(a: unknown, b: unknown, path: string, problems: string[]): void {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      problems.push(`${path}: list length differs`);
      return;
    }
    a.forEach((item, i) => compare(item, b[i], `${path}[${i}]`, problems));
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') {
      problems.push(`${path}: not an object`);
      return;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.join() !== keysB.join()) {
      problems.push(`${path}: keys differ (${keysA.join()} vs ${keysB.join()})`);
      return;
    }
    keysA.forEach((key) => compare((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`, problems));
  } else if (typeof a !== typeof b) {
    problems.push(`${path}: type differs`);
  }
}

for (const [name, translation] of [['config.zh.json', zh], ['config.hk.json', hk], ['config.mx.json', mx], ['config.nl.json', nl]] as const) {
  describe(name, () => {
    it('has the same shape as config.json', () => {
      const problems: string[] = [];
      compare(en, translation, 'config', problems);
      expect(problems).toEqual([]);
    });

    it('keeps links, images and icons identical to the English config', () => {
      const urls = (config: unknown): string[] => {
        const found: string[] = [];
        JSON.stringify(config, (key, value) => {
          // A nav item's #anchor is translated (section ids are not), so compare only its path.
          if (key === 'siteLocation') found.push(JSON.stringify(String(value).split('#')[0]));
          else if (['src', 'url', 'link', 'demoLink', 'icon', 'imgs', 'scrollSection'].includes(key)) found.push(JSON.stringify(value));
          return value;
        });
        return found;
      };
      expect(urls(translation)).toEqual(urls(en));
    });
  });
}
