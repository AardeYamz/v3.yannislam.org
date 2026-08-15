import { Component, ChangeDetectionStrategy, Inject, PLATFORM_ID, signal, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { fadeStaggerAnimation } from 'src/app/animations/fade-stagger.animation';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import { ResumeService } from 'src/app/services/resume/resume.service';
import { SiteConfigService } from 'src/app/services/site-config/site-config.service';

// Minimum/maximum time the guided auto-scroll is allowed to take, regardless of page length.
const AUTO_SCROLL_MIN_DURATION_MS = 6000;
const AUTO_SCROLL_MAX_DURATION_MS = 30000;
const AUTO_SCROLL_PIXELS_PER_SECOND = 140;

// Fixed ease-in/ease-out duration, independent of the scroll's total length.
// A full sine ease-in-out spread across the *entire* duration (up to
// AUTO_SCROLL_MAX_DURATION_MS = 30s) has a velocity near zero for well over
// a second at each end — long enough that individual sub-pixel frame steps
// become visible as a stutter before the motion "catches up" to a cruising
// speed, reading as jolty/abrupt rather than smooth. Keeping the ramps a
// fixed, short duration and holding a constant velocity in between (a
// trapezoidal velocity profile — ramp up, cruise, ramp down) means the slow
// part of the motion is always brief, however long the scroll itself is.
const AUTO_SCROLL_EASE_MS = 600;

// Fraction of the total distance covered by elapsed time `t` (0..1) into a
// `durationMs`-long scroll, using a trapezoidal velocity profile: linear
// ramp up to full speed over `easeMs`, constant velocity through the
// middle, linear ramp down over the last `easeMs`. Exported (pure, no
// component state) so it can be unit-tested directly against duration and
// distance to catch discontinuities without going through the DOM/rAF.
export function scrollEaseProgress(t: number, durationMs: number, easeMs = AUTO_SCROLL_EASE_MS): number {
    const clampedT = Math.min(Math.max(t, 0), 1);
    // Half the ramp can't exceed half the total duration, or the ramps would
    // overlap and there'd be no cruising segment at all.
    const e = Math.min(easeMs / durationMs, 0.5);

    if (e <= 0) return clampedT;

    let raw: number;
    if (clampedT < e) {
        // Ramp up: linearly increasing velocity from 0 to 1 (constant
        // acceleration), so distance covered is the classic t²/(2e).
        raw = (clampedT * clampedT) / (2 * e);
    } else if (clampedT < 1 - e) {
        // Cruise at the ramp's peak velocity (1), continuing on from the
        // distance the ramp-up already covered (e/2).
        raw = e / 2 + (clampedT - e);
    } else {
        // Ramp down: mirror of ramp up, measured from the end.
        const s = 1 - clampedT;
        raw = (1 - e) - (s * s) / (2 * e);
    }

    // The three segments' areas sum to (1 - e) at t=1, not 1 (a symmetric
    // ramp up + cruise + ramp down of a unit-peak trapezoid covers slightly
    // less area than the full rectangle it's inscribed in) — normalize so
    // progress(1) lands exactly on 1 regardless of e.
    return raw / (1 - e);
}

@Component({
    selector: 'app-banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss'],
    animations: [
        fadeStaggerAnimation('bannerTrigger', 'translateX(-50px)')
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class BannerComponent implements OnDestroy {
    // ngx-typed-js (and the typed.js library it wraps) calls getComputedStyle()
    // and otherwise assumes a real browser, which throws under Domino during
    // server-side prerendering - so it's only rendered client-side (see
    // banner.component.html), with a static first line shown on the server.
    readonly isBrowser: boolean;

    showScrollArrow = signal(false);

    private autoScrollFrame: number | null = null;
    private cancelAutoScroll: (() => void) | null = null;

    constructor(
        public analyticsService: AnalyticsService,
        public configService: SiteConfigService,
        private resumeService: ResumeService,
        @Inject(PLATFORM_ID) platformId: object,
    ) {
        this.isBrowser = isPlatformBrowser(platformId);
        if (this.isBrowser) {
            setTimeout(() => this.showScrollArrow.set(true), 5000);
        }
    }

    get data() { return this.configService.data; }

    openResume() {
        this.analyticsService.sendAnalyticEvent('click_open_resume', 'banner', 'resume');
        this.resumeService.open();
    }

    ngOnDestroy() {
        this.stopAutoScroll();
    }

    // Scrolls continuously from the current position all the way through the
    // rest of the page (about -> education -> experience -> volunteering) at a
    // constant slow pace, instead of jumping section-to-section. Cancels itself
    // the moment the user scrolls, drags, or presses a key, so it never fights
    // with manual scrolling.
    scrollToAbout() {
        if (!this.isBrowser) return;

        const volunteeringSection = document.getElementById('volunteering');
        const startPosition = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const targetPosition = volunteeringSection
            ? Math.min(volunteeringSection.offsetTop + volunteeringSection.offsetHeight - window.innerHeight, maxScroll)
            : maxScroll;

        this.startAutoScroll(startPosition, targetPosition);
    }

    private startAutoScroll(startPosition: number, targetPosition: number) {
        this.stopAutoScroll();

        const distance = targetPosition - startPosition;
        if (Math.abs(distance) < 10) return;

        const duration = Math.min(
            Math.max((Math.abs(distance) / AUTO_SCROLL_PIXELS_PER_SECOND) * 1000, AUTO_SCROLL_MIN_DURATION_MS),
            AUTO_SCROLL_MAX_DURATION_MS
        );

        let start: number | null = null;

        const stop = () => {
            if (this.autoScrollFrame !== null) {
                cancelAnimationFrame(this.autoScrollFrame);
                this.autoScrollFrame = null;
            }
            window.removeEventListener('wheel', stop);
            window.removeEventListener('touchstart', stop);
            window.removeEventListener('pointerdown', stop);
            window.removeEventListener('keydown', stop);
            this.cancelAutoScroll = null;
        };
        this.cancelAutoScroll = stop;

        window.addEventListener('wheel', stop, { passive: true });
        window.addEventListener('touchstart', stop, { passive: true });
        window.addEventListener('pointerdown', stop, { passive: true });
        window.addEventListener('keydown', stop);

        const animate = (timestamp: number) => {
            if (start === null) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const y = startPosition + distance * scrollEaseProgress(progress, duration);
            // behavior: 'instant', not the two-arg scrollTo(0, y) form: this
            // page (via Bootstrap's reboot) sets `scroll-behavior: smooth`
            // on <html>, which the two-arg form inherits — every one of
            // these per-frame calls would then kick off *another* browser-
            // driven smooth scroll toward a target that's barely moved from
            // the last frame's, each one interrupting the last before it
            // finishes. The net effect is the page barely creeping forward
            // no matter how fast the animation itself is computing the
            // curve, which is what actually read as jolty/stuck rather than
            // gliding. `behavior: 'instant'` makes each frame's jump exactly
            // that — instant — so this rAF loop is the only thing driving
            // the motion, with nothing else fighting it over the target.
            window.scrollTo({ top: y, left: 0, behavior: 'instant' });

            if (progress < 1) {
                this.autoScrollFrame = requestAnimationFrame(animate);
            } else {
                stop();
            }
        };

        this.autoScrollFrame = requestAnimationFrame(animate);
    }

    private stopAutoScroll() {
        this.cancelAutoScroll?.();
    }
}
