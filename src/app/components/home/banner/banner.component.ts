import { Component, OnInit } from '@angular/core';

import { animate, query, stagger, style, transition, trigger } from "@angular/animations";
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';


@Component({
    selector: 'app-banner',
    templateUrl: './banner.component.html',
    styleUrls: ['./banner.component.scss'],
    animations: [
        trigger('bannerTrigger', [
            transition(":enter", [
                query("*", [
                    style({ opacity: 0, transform: "translateX(-50px)" }),
                    stagger(50, [
                        animate("250ms cubic-bezier(0.35, 0, 0.25, 1)", style({ opacity: 1, transform: "none" }))
                    ])
                ])
            ])
        ])
    ],
    standalone: false
})
export class BannerComponent implements OnInit {
    data: any = jsonData;

    constructor(
        public analyticsService: AnalyticsService
    ) { }

    ngOnInit(): void {

    }
}
