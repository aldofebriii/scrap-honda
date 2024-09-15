import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Product {
    @PrimaryGeneratedColumn()
    declare id: number;

    @Column("text")
    declare nama: string;

    @Column("int")
    declare harga: number;

    @Column({nullable: true})
    declare kategori: string;

    @Column({nullable: true})
    declare kode_part: string;

    @Column("text", {nullable: true})
    declare motor: string;

    @Column("int")
    declare page: number;
}
