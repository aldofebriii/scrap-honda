import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Page {
    @PrimaryColumn()
    declare id: number;
    @Column("int", { default: 1 })
    declare current_page: number;
}
