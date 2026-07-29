import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const URL_PATTERN = /(https?:\/\/[^\s)]+)/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

@Pipe({
  name: 'linkify',
  standalone: false
})
export class LinkifyPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) { }

  transform(text: string): SafeHtml {
    const parts = (text ?? '').split(URL_PATTERN);
    const html = parts
      .map((part, i) => i % 2 === 1
        ? `<a href="${escapeHtml(part)}" target="_blank" rel="noopener">${escapeHtml(part)}</a>`
        : escapeHtml(part))
      .join('');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
