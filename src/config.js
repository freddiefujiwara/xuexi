// データAPI(xuexi-gas の /exec)のURL。
// ビルド時に CI がシークレット API の値で "<API>" を置換する(他のアプリと同じ方式)。
const RAW = '<API>';

export const API_URL = RAW.startsWith('http') ? RAW : '';
