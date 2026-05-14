import type { NewsSourceConfig } from "@/features/news/types";

const timeoutMs = 10000;

export const defaultNewsSources: NewsSourceConfig[] = [
  {
    key: "nbs-latest",
    name: "国家统计局",
    adapterType: "html",
    url: "https://www.stats.gov.cn/sj/zxfb/",
    region: "china",
    enabled: true,
    priority: 9,
    timeoutMs
  },
  {
    key: "federal-reserve",
    name: "Federal Reserve",
    adapterType: "rss",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    region: "north-america",
    enabled: true,
    priority: 9,
    timeoutMs
  },
  {
    key: "sec-press",
    name: "SEC",
    adapterType: "rss",
    url: "https://www.sec.gov/news/pressreleases.rss",
    region: "north-america",
    enabled: true,
    priority: 7,
    timeoutMs
  },
  {
    key: "bls-latest",
    name: "BLS",
    adapterType: "rss",
    url: "https://www.bls.gov/feed/bls_latest.rss",
    region: "north-america",
    enabled: true,
    priority: 8,
    timeoutMs
  },
  {
    key: "economic-observer",
    name: "经济观察网",
    adapterType: "rss",
    url: "http://www.eeo.com.cn/rss.xml",
    region: "china",
    enabled: true,
    priority: 5,
    timeoutMs
  },
  {
    key: "pboc-news",
    name: "中国人民银行",
    adapterType: "html",
    url: "http://www.pbc.gov.cn/goutongjiaoliu/113456/113469/index.html",
    region: "china",
    enabled: true,
    priority: 10,
    timeoutMs
  },
  {
    key: "csrc-news",
    name: "中国证监会",
    adapterType: "html",
    url: "http://www.csrc.gov.cn/csrc/c100028/common_list.shtml",
    region: "china",
    enabled: true,
    priority: 9,
    timeoutMs
  },
  {
    key: "sse-news",
    name: "上海证券交易所",
    adapterType: "html",
    url: "https://www.sse.com.cn/aboutus/mediacenter/hotandd/",
    region: "china",
    enabled: true,
    priority: 7,
    timeoutMs
  },
  {
    key: "stcn-finance",
    name: "证券时报",
    adapterType: "html",
    url: "https://www.stcn.com/",
    region: "china",
    enabled: true,
    priority: 6,
    timeoutMs
  },
  {
    key: "cnstock",
    name: "上海证券报",
    adapterType: "html",
    url: "https://www.cnstock.com/",
    region: "china",
    enabled: true,
    priority: 6,
    timeoutMs
  },
  {
    key: "yicai-news",
    name: "第一财经",
    adapterType: "html",
    url: "https://www.yicai.com/news/",
    region: "china",
    enabled: true,
    priority: 6,
    timeoutMs
  }
];
