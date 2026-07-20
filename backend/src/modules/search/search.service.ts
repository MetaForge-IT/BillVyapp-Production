import type { AuthContext } from "../auth/auth.types";
import { searchRepository } from "./search.repository";

export class SearchService {
  search(auth: AuthContext, query: string) {
    return searchRepository.search(auth.salonId, query);
  }
}

export const searchService = new SearchService();
