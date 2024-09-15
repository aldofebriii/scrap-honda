import { JSDOM } from "jsdom";
import { DataSource, MoreThan, MoreThanOrEqual } from "typeorm";
import { Page } from "./entity/page.entity";
import { Product } from "./entity/product.entity";
class FailedFetchError extends Error {
    constructor() {
        super("Failed On Fetch");
    }
}

class NoMoreItemError extends Error {
    constructor() {
        super("No More item");
    }
}

const AppDataSource = new DataSource({
    type: "sqlite",
    database: "honda.db",
    synchronize: true,
    entities: [Page, Product],
});
let productRepo, pageRepo;
let container: Product[] = [];
async function getDataFromDetail(url: string, page: number) {
    console.log(url);
    const itemPageRes = await fetch(url);
    if (itemPageRes.ok) {
        const itemHtml = await itemPageRes.text();
        const doc = new JSDOM(itemHtml).window.document;
        const namaEl = doc.querySelector(
            ".product_title, .entry_title"
        ) as HTMLHeadingElement;
        const nama = namaEl.textContent as string;
        const hargaEl = doc.querySelector(".amount") as HTMLSpanElement;
        const harga = parseInt(
            hargaEl.children[0].textContent!.replace("Rp", "").replace(",", "")
        );
        const kodePartEl = doc.querySelector(
            "span.sku_wrapper"
        ) as HTMLSpanElement;
        const kodePart = kodePartEl?.children[0]?.textContent as string;
        const kategoriEl = doc.querySelector(
            "span.posted_in"
        ) as HTMLSpanElement;
        const kategori = kategoriEl?.children[0]?.textContent as string;
        const listMotorEl = doc.querySelector(
            "div.product_metas > section > ul"
        )?.children;
        const motorContainer = [];
        if (listMotorEl) {
            for (const li of listMotorEl) {
                const motor = li.textContent;
                if (motor) {
                    motorContainer.push(motor as string);
                }
            }
        }
        const produk = new Product();
        produk.nama = nama;
        produk.harga = harga;
        produk.kategori = kategori;
        produk.kode_part = kodePart;
        produk.motor = motorContainer.join(", ");
        produk.page = page;
        container.push(produk);
    } else {
        throw new FailedFetchError();
    }
}

async function getUrlFromPage(page: number) {
    const htmlPageRes = await fetch(
        `https://www.hondacengkareng.com/kategori-produk/suku-cadang-resmi-motor-honda/?fwp_paged=${page}`
    );
    if (htmlPageRes.ok) {
        const htmlPage = (await htmlPageRes.text()).replace("\n", "");
        const doc = new JSDOM(htmlPage).window.document;
        const ul = doc.querySelector(
            "body > div.site-container > div.algolia-content > div > div > div > main > ul"
        ) as HTMLUListElement;
        if (ul) {
            const items = ul.children;
            for (const item of items) {
                const a = item.children[0] as HTMLAnchorElement;
                await getDataFromDetail(a.href, page);
            }
        } else {
            throw new NoMoreItemError();
        }
    } else {
        throw new FailedFetchError();
    }
}

async function bootstrap() {
    await AppDataSource.initialize();
    pageRepo = AppDataSource.getRepository(Page);
    productRepo = AppDataSource.getRepository(Product);
    const savedPage = await pageRepo.findOne({
        where: { current_page: MoreThan(1) },
    });
    let paged = savedPage ? savedPage : new Page();
    if (!savedPage) {
        paged.id = 1;
        paged.current_page = 1;
    }
    await productRepo.delete({
        page: MoreThanOrEqual(paged.current_page),
    });
    let keepLooping = true;
    while (keepLooping) {
        try {
            await getUrlFromPage(paged.current_page);
            if (container.length > 0) {
                console.log(container);
                const saved = await productRepo.save(container);
                console.log(saved);
                container = [];
            }
            pageRepo.save(paged);
            paged.current_page++;
            /**
             * @description only for testing
             */
            // if (paged.current_page === 3) {
            //     keepLooping = false;
            // }
        } catch (err) {
            console.log(err);
            break;
        }
    }
}

bootstrap();
