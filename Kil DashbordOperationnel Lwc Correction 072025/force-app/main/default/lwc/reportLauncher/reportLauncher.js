// reportLauncher.js  – version 100 % fonctionnelle
import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class ReportLauncher extends NavigationMixin(LightningElement) {
    @api recordId;
    REPORT_ID = '00OOu000001KuofMAC';   // ton rapport
    FILTER    = 'fv4';                  // le paramètre dynamique

    handleClick() {
        const pageRef = {
            type: 'standard__recordPage',
            attributes: {
                recordId:      this.REPORT_ID,
                objectApiName: 'Report',   // ⬅️ indispensable
                actionName:    'view'
            },
            state: { [this.FILTER]: this.recordId }
        };

        this[NavigationMixin.GenerateUrl](pageRef).then(url => {
            window.open(url, '_blank');            // ➜ /lightning/r/Report/00O…/view?fv4=...
            this.dispatchEvent(new CloseActionScreenEvent());
        });
    }
}
