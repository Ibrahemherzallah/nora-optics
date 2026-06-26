import {requireAdmin} from "../middleware";
import {Router} from "express";
import { Customer } from '../models/Customer';
import { SaleFile } from '../models/SaleFile';
import { EyeExam } from '../models/EyeExam';


const router = Router();

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


router.get('/admin/customers-list', requireAdmin, async (req, res, next) => {
    try {
        const { search, page = '1', limit = '30' } = req.query as any;
        const p = Math.max(1, parseInt(page));
        const l = Math.min(100, parseInt(limit));
        const q: any = {};
        if (search) {
            const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
            q.$or = [{ name: rx }, { phone: rx }];
        }
        const [customers, total] = await Promise.all([
            Customer.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).lean(),
            Customer.countDocuments(q),
        ]);

        // attach sale file + eye exam refs in one round-trip each
        const ids = customers.map((c) => c._id);
        const [saleFiles, eyeExams] = await Promise.all([
            SaleFile.find({ customer: { $in: ids } }).select('customer totalSelling totalProfit isVoided records').lean(),
            EyeExam.find({ customer: { $in: ids } }).select('customer records').lean(),
        ]);

        const sfMap = new Map(saleFiles.map((f) => [String(f.customer), f]));
        const eeMap = new Map(eyeExams.map((e) => [String(e.customer), e]));

        const data = customers.map((c) => ({
            ...c,
            saleFile: sfMap.get(String(c._id)) ?? null,
            eyeExam: eeMap.get(String(c._id)) ?? null,
        }));

        res.json({ data, page: p, limit: l, total });
    } catch (e) {
        next(e);
    }
});

export default router;