import { Pagination } from "@/constants/Pagination";

export class BaseQuery {
    public page: number = Pagination.DEFAULT_PAGE;
    public limit: number = Pagination.DEFAULT_LIMIT;
}