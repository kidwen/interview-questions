import { Component, Input, ElementRef, ViewChild, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HomeCardData } from '../../services/home.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {
  @Input({ required: true }) data!: HomeCardData;
  @ViewChild('card') cardRef!: ElementRef<HTMLDivElement>;

  constructor(private readonly renderer: Renderer2) {}

  onMouseMove(e: MouseEvent) {
    const card = this.cardRef.nativeElement;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 鼠标位置部分“靠近”用户：
    // 鼠标在左边(x < center)，左边翘起 -> rotateY 应该为正
    // 鼠标在上边(y < center)，上边翘起 -> rotateX 应该为负
    const rotateX = ((y - centerY) / centerY) * 16; // 加大角度到 16 度
    const rotateY = ((x - centerX) / centerX) * -16;

    // Use setProperty directly for CSS variables
    card.style.setProperty('--rotate-x', `${rotateX}deg`);
    card.style.setProperty('--rotate-y', `${rotateY}deg`);
  }

  onMouseLeave() {
    const card = this.cardRef.nativeElement;
    card.style.setProperty('--rotate-x', '0deg');
    card.style.setProperty('--rotate-y', '0deg');
  }
}
