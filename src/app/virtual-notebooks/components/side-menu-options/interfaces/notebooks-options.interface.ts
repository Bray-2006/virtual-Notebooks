export interface NotebooksOptions {
    id: number;
    carpetName: string;
    notebooks: NotebookItem[];

}
export interface NotebookItem {
    id: number;
    icon: string;
    name: string;
}