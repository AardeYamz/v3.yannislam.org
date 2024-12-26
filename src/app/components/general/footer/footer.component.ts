import { animate, query, stagger, style, transition, trigger } from '@angular/animations';
import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics/analytics.service';
import * as jsonData from '../../../../assets/config.json';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
    animations: [
        trigger("animateFooter", [
            transition(":enter", [
                query("*", [
                    style({ opacity: 0, transform: "translateY(100%)" }),
                    stagger(50, [
                        animate("250ms cubic-bezier(0.35, 0, 0.25, 1)", style({ opacity: 1, transform: "none" }))
                    ])
                ])
            ])
        ])
    ],
    standalone: false
})
export class FooterComponent implements OnInit {
    data: any = jsonData;
    socials: any = this.data.about.contact;
    currentDate = new Date();
    email: any = this.socials.find((item: { name: string; }) => item?.name === "Email");

    constructor(
        public analyticsService: AnalyticsService,
    ) { }

    ngOnInit() {
        console.log(this.data)
    }

}