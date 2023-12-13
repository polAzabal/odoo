/** @odoo-module */

/* Copyright (c) 2016-Present Webkul Software Pvt. Ltd. (<https://webkul.com/>) */
/* See LICENSE file for full copyright and licensing details. */
/* License URL : <https://store.webkul.com/license.html/> */
import { patch } from "@web/core/utils/patch";
import { Order } from "@point_of_sale/app/store/models";
import { _t } from "@web/core/l10n/translation";
import { serializeDateTime } from "@web/core/l10n/dates";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { PosStore } from "@point_of_sale/app/store/pos_store";
import {  App, onMounted } from "@odoo/owl";

import { renderToString } from "@web/core/utils/render";
patch(Order.prototype, {
    setup(_defaultObj, options) {
        super.setup(...arguments);
        if (!this.validation_date) {
            this.validation_date = serializeDateTime(this.date_order)
        }
        
    },
    export_for_printing() {
        var dict = super.export_for_printing(...arguments);
        dict.company = this.pos.company;
        dict.rOrder=this
        return dict;
    },

});


patch(PosStore.prototype, {
    async _processData(loadedData) {
        await super._processData(...arguments);
        this._loadReceiptDesign(loadedData['receipt.design']);
    },
    _loadReceiptDesign(designs) {
        this.db.all_designs = designs;
        var receipt_by_id = {};
        designs.forEach(function (design) {
            receipt_by_id[design.id] = design;
        });
        this.db.receipt_by_id = receipt_by_id;
    }
});
patch(OrderReceipt.prototype,{
    setup(){
        super.setup()
      
        onMounted(async()=>{
            var self=this
            var env=self.env
            if (env.services.pos.config.use_custom_receipt) {
                var receipt_design_id = env.services.pos.config.receipt_design_id[0]
                var receipt_design = env.services.pos.db.receipt_by_id[receipt_design_id].receipt_design
                var order = this.props.data.rOrder
                var data = {
                    widget: self.env,
                    pos: order.pos,
                    order: order,
                    receipt: order.export_for_printing(),
                    orderlines: order.get_orderlines(),
                    paymentlines: order.get_paymentlines(),
                };
                var parser = new DOMParser();
                var strtemplate = '<templates><t t-name="receipt_design">' + receipt_design + '</t></templates>'
                var xmlDoc = parser.parseFromString(strtemplate, "text/xml");
                var template = xmlDoc.querySelectorAll("templates > [t-name]")[0]
                // OrderReceipt.template="receipt_design"
                const app = renderToString.app;
                app.addTemplate("receipt_design", template);
                var receipt =await renderToString("receipt_design", data);
                $('div.pos-receipt').replaceWith(receipt);
            }
        })
    }
})

