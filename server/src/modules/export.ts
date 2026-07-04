import { Router } from 'express';
import { requireAdmin } from '../middleware';
import { SaleFile } from '../models/SaleFile';
import { EyeExam } from '../models/EyeExam';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Order } from '../models/Order';
import ExcelJS from 'exceljs';

const router = Router();

function styleHeader(ws: ExcelJS.Worksheet) {
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    headerRow.commit();
}

const STATUS_AR: Record<string, string> = {
    pending: 'قيد الانتظار',
    confirmed: 'مؤكد',
    out_for_delivery: 'قيد التوصيل',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
};

const sourceLabel = (s: string) =>
    s === 'external' ? 'خارجي' : s === 'internal' ? 'داخلي' : 'قديم';

router.get('/admin/export', requireAdmin, async (req, res, next) => {
    try {
        const [saleFiles, eyeExams, customers, products, categoriesList, ordersList] = await Promise.all([
            SaleFile.find().populate('customer', 'name phone address').lean(),
            EyeExam.find().populate('customer', 'name phone').lean(),
            Customer.find().lean(),
            Product.find().lean(),
            Category.find().lean(),
            Order.find().lean(),
        ]);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Nora Optics';
        wb.created = new Date();

        // ── Sheet 1: Summary ───────────────────────────────────────
        const wsSummary = wb.addWorksheet('ملخص');
        wsSummary.views = [{ rightToLeft: true }];
        wsSummary.getColumn(1).width = 30;
        wsSummary.getColumn(2).width = 18;

        const summaryData: any[][] = [
            ['تاريخ التصدير', new Date().toLocaleDateString('ar-SA')],
            [],
            ['عدد العملاء', customers.length],
            ['عدد المنتجات', products.length],
            ['عدد الأصناف', categoriesList.length],
            ['عدد الطلبات', ordersList.length],
            ['عدد ملفات البيع', saleFiles.length],
            ['عدد فحوصات النظر', eyeExams.length],
            [],
            ['إجمالي المبيعات (ملفات البيع)', saleFiles.reduce((s: number, f: any) => s + (f.totalSelling || 0), 0)],
            ['إجمالي الأرباح (ملفات البيع)', saleFiles.filter((f: any) => !f.isVoided).reduce((s: number, f: any) => s + (f.totalProfit || 0), 0)],
        ];
        summaryData.forEach((row) => wsSummary.addRow(row));
        wsSummary.getRow(1).font = { bold: true, size: 13 };

        // ── Sheet 2: Customers ─────────────────────────────────────
        const wsCustomers = wb.addWorksheet('العملاء');
        wsCustomers.views = [{ rightToLeft: true }];
        wsCustomers.columns = [
            { header: 'الاسم',         key: 'name',      width: 25 },
            { header: 'الهاتف',        key: 'phone',     width: 18 },
            { header: 'العنوان',       key: 'address',   width: 30 },
            { header: 'العمر',         key: 'age',       width: 10 },
            { header: 'الجنس',         key: 'sex',       width: 12 },
            { header: 'المصدر',        key: 'source',    width: 12 },
            { header: 'تاريخ الإضافة', key: 'createdAt', width: 18 },
        ];
        styleHeader(wsCustomers);
        customers.forEach((c: any) => {
            wsCustomers.addRow({
                name:      c.name,
                phone:     c.phone || '',
                address:   c.address || '',
                age:       c.age || '',
                sex:       c.sex === 'male' ? 'ذكر' : c.sex === 'female' ? 'أنثى' : '',
                source:    c.source === 'online' ? 'أونلاين' : 'المحل',
                createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : '',
            });
        });

        // ── Sheet 3: Sale Records ──────────────────────────────────
        const wsSales = wb.addWorksheet('ملفات البيع');
        wsSales.views = [{ rightToLeft: true }];
        wsSales.columns = [
            { header: 'العميل',        key: 'customer',    width: 25 },
            { header: 'الهاتف',        key: 'phone',       width: 18 },
            { header: 'المنتج',        key: 'product',     width: 25 },
            { header: 'الكود',         key: 'code',        width: 14 },
            { header: 'الكمية',        key: 'qty',         width: 10 },
            { header: 'سعر البيع',     key: 'price',       width: 14 },
            { header: 'إجمالي البيع',  key: 'total',       width: 14 },
            { header: 'الربح',         key: 'profit',      width: 14 },
            { header: 'ملحقات',        key: 'accessories', width: 20 },
            { header: 'ملاحظات',       key: 'notes',       width: 25 },
            { header: 'المصدر',        key: 'origin',      width: 12 },
            { header: 'تاريخ العملية', key: 'date',        width: 18 },
        ];
        styleHeader(wsSales);
        saleFiles.forEach((sf: any) => {
            const customerName  = sf.walkIn ? 'زبون محل' : (sf.customer?.name || '—');
            const customerPhone = sf.customer?.phone || '';
            (sf.records || []).forEach((r: any) => {
                wsSales.addRow({
                    customer:    customerName,
                    phone:       customerPhone,
                    product:     r.productNameSnap,
                    code:        r.productCodeSnap,
                    qty:         r.quantity,
                    price:       r.sellingPrice,
                    total:       r.sellingPrice * r.quantity,
                    profit:      r.profit,
                    accessories: r.hasAccessories ? (r.accessoriesDesc || 'نعم') : '',
                    notes:       r.notes || '',
                    origin:      sf.origin === 'online' ? 'أونلاين' : 'المحل',
                    date:        new Date(r.date ?? r.createdAt).toLocaleDateString('en-GB'),
                });
            });
        });

        // ── Sheet 4: Eye Exams ─────────────────────────────────────
        const wsExams = wb.addWorksheet('فحوصات النظر');
        wsExams.views = [{ rightToLeft: true }];
        wsExams.columns = [
            { header: 'العميل',      key: 'customer', width: 25 },
            { header: 'الهاتف',      key: 'phone',    width: 18 },
            { header: 'المصدر',      key: 'source',   width: 14 },
            { header: 'الطبيب',      key: 'doctor',   width: 20 },
            { header: 'R - Sph',     key: 'r_sph',    width: 10 },
            { header: 'R - Cyl',     key: 'r_cyl',    width: 10 },
            { header: 'R - Axis',    key: 'r_axis',   width: 10 },
            { header: 'R - Add',     key: 'r_add',    width: 10 },
            { header: 'R - V.A',     key: 'r_va',     width: 10 },
            { header: 'L - Sph',     key: 'l_sph',    width: 10 },
            { header: 'L - Cyl',     key: 'l_cyl',    width: 10 },
            { header: 'L - Axis',    key: 'l_axis',   width: 10 },
            { header: 'L - Add',     key: 'l_add',    width: 10 },
            { header: 'L - V.A',     key: 'l_va',     width: 10 },
            { header: 'I.P.D',       key: 'ipd',      width: 10 },
            { header: 'تاريخ الفحص', key: 'date',     width: 18 },
        ];
        styleHeader(wsExams);
        eyeExams.forEach((exam: any) => {
            (exam.records || []).forEach((r: any) => {
                wsExams.addRow({
                    customer: exam.customer?.name || '—',
                    phone:    exam.customer?.phone || '',
                    source:   sourceLabel(r.source),
                    doctor:   r.doctorName || '',
                    r_sph:    r.right?.sph || '',
                    r_cyl:    r.right?.cyl || '',
                    r_axis:   r.right?.axis || '',
                    r_add:    r.right?.add || '',
                    r_va:     r.right?.va || '',
                    l_sph:    r.left?.sph || '',
                    l_cyl:    r.left?.cyl || '',
                    l_axis:   r.left?.axis || '',
                    l_add:    r.left?.add || '',
                    l_va:     r.left?.va || '',
                    ipd:      r.ipd || '',
                    date:     new Date(r.date ?? r.createdAt).toLocaleDateString('en-GB'),
                });
            });
        });

        // ── Sheet 5: Products ──────────────────────────────────────
        const wsProducts = wb.addWorksheet('المنتجات');
        wsProducts.views = [{ rightToLeft: true }];
        wsProducts.columns = [
            { header: 'الاسم',         key: 'name',      width: 25 },
            { header: 'الكود',         key: 'code',      width: 14 },
            { header: 'السعر',         key: 'price',     width: 12 },
            { header: 'التكلفة',       key: 'cost',      width: 12 },
            { header: 'المقاس',        key: 'size',      width: 12 },
            { header: 'الألوان',       key: 'colors',    width: 25 },
            { header: 'الحالة',        key: 'status',    width: 14 },
            { header: 'مميز',          key: 'featured',  width: 10 },
            { header: 'تاريخ الإضافة', key: 'createdAt', width: 18 },
        ];
        styleHeader(wsProducts);
        products.forEach((p: any) => {
            wsProducts.addRow({
                name:      p.name,
                code:      p.code,
                price:     p.price,
                cost:      p.cost,
                size:      p.size || '',
                colors:    (p.colors || []).map((c: any) => c.name).filter(Boolean).join(' / ') || '—',
                status:    p.isSoldOut ? 'نفذت' : p.isDisappear ? 'مخفي' : 'متوفر',
                featured:  p.isFeatured ? 'نعم' : 'لا',
                createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '',
            });
        });

        // ── Sheet 6: Categories ────────────────────────────────────
        const wsCategories = wb.addWorksheet('الأصناف');
        wsCategories.views = [{ rightToLeft: true }];
        wsCategories.columns = [
            { header: 'الاسم',         key: 'name',        width: 25 },
            { header: 'الوصف',         key: 'description', width: 35 },
            { header: 'تاريخ الإضافة', key: 'createdAt',   width: 18 },
        ];
        styleHeader(wsCategories);
        categoriesList.forEach((c: any) => {
            wsCategories.addRow({
                name:        c.name,
                description: c.description || '',
                createdAt:   c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB') : '',
            });
        });

        // ── Sheet 7: Orders ────────────────────────────────────────
        const wsOrders = wb.addWorksheet('الطلبات');
        wsOrders.views = [{ rightToLeft: true }];
        wsOrders.columns = [
            { header: 'رقم الطلب',    key: 'orderNumber', width: 16 },
            { header: 'العميل',       key: 'customer',    width: 22 },
            { header: 'الهاتف',       key: 'phone',       width: 16 },
            { header: 'العنوان',      key: 'address',     width: 25 },
            { header: 'المنطقة',      key: 'zone',        width: 16 },
            { header: 'المنتجات',     key: 'items',       width: 35 },
            { header: 'المجموع',      key: 'subtotal',    width: 12 },
            { header: 'التوصيل',      key: 'delivery',    width: 12 },
            { header: 'الإجمالي',     key: 'total',       width: 12 },
            { header: 'الحالة',       key: 'status',      width: 16 },
            { header: 'تاريخ الطلب',  key: 'createdAt',   width: 18 },
        ];
        styleHeader(wsOrders);
        ordersList.forEach((o: any) => {
            wsOrders.addRow({
                orderNumber: o.orderNumber,
                customer:    o.customerName,
                phone:       o.phone,
                address:     o.address || '',
                zone:        o.deliveryZone,
                items:       (o.items || []).map((i: any) => `${i.nameSnap} (${i.quantity})`).join(' + '),
                subtotal:    o.subtotal,
                delivery:    o.deliveryFee,
                total:       o.total,
                status:      STATUS_AR[o.status] || o.status,
                createdAt:   o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-GB') : '',
            });
        });

        // ── Stream response ────────────────────────────────────────
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="nora-export-${new Date().toISOString().slice(0, 10)}.xlsx"`);
        await wb.xlsx.write(res);
        res.end();
    } catch (e) {
        next(e);
    }
});

export default router;