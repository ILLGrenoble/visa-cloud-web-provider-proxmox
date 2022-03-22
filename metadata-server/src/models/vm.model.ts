
import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class VM {
    
    @PrimaryColumn()
    id: string;

    @Column()
    userData: string;

    @Column()
    metaData: string;
}