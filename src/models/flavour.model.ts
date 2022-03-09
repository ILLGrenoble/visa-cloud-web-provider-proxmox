import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Flavour {
    
    @PrimaryColumn()
    id: string;

    @Column()
    name: string;

    @Column()
    cpus: number;

    @Column()
    disk: number;

    @Column()
    ram: number;
}
