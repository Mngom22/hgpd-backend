import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactMessage } from './entities/contact-message.entity';
import { CreateContactDto } from './dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    @InjectRepository(ContactMessage)
    private readonly contactRepository: Repository<ContactMessage>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateContactDto): Promise<{ message: string }> {
    // Sauvegarder en BDD
    const contactMessage = this.contactRepository.create(dto);
    await this.contactRepository.save(contactMessage);

    // Envoyer l'email à l'adresse de contact de l'entreprise
    try {
      await this.mailService.sendContactMessage(dto);
      this.logger.log(`Contact message from ${dto.email} sent successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to send contact email from ${dto.email}: ${error.message}`,
      );
      // Le message est sauvegardé en BDD même si l'envoi échoue
    }

    return { message: 'Votre message a été envoyé avec succès. Nous vous répondrons dans les plus brefs délais.' };
  }

  async findAll(): Promise<ContactMessage[]> {
    return this.contactRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
